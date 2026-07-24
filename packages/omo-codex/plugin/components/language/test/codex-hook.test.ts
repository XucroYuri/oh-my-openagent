import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runUserPromptSubmitHook } from "../src/codex-hook.js";

const languageCases = [
	{ prompt: "请帮我修复这个错误。", language: "Chinese" },
	{ prompt: "Please fix this error.", language: "English" },
	{ prompt: "このエラーを直してください。", language: "Japanese" },
	{ prompt: "이 오류를 수정해 주세요.", language: "Korean" },
] as const;

describe("codex language hook", () => {
	it.each(languageCases)("#given $language input #when hook runs #then emits that language directive", ({
		prompt,
		language,
	}) => {
		// given
		const payload = { hook_event_name: "UserPromptSubmit", prompt };

		// when
		const output = runUserPromptSubmitHook(payload);
		const directiveLanguage = languageFromHookOutput(output);

		// then
		expect(directiveLanguage).toBe(language);
	});

	it.each([
		"",
		"!? ...",
		"😀🎉",
	] as const)("#given undetermined input #when hook runs #then emits no output", (prompt) => {
		// given
		const payload = { hook_event_name: "UserPromptSubmit", prompt };

		// when
		const output = runUserPromptSubmitHook(payload);

		// then
		expect(output).toBe("");
	});

	it("#given the last hook directive uses the current language #when hook runs #then does not repeat it", () => {
		// given
		const transcriptPath = writeTranscript(
			runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", prompt: "你好" }),
		);
		const payload = { hook_event_name: "UserPromptSubmit", prompt: "请继续", transcript_path: transcriptPath };

		// when
		const output = runUserPromptSubmitHook(payload);

		// then
		expect(output).toBe("");
	});

	it("#given an older language directive differs from the latest one #when that older language returns #then emits a fresh directive", () => {
		// given
		const chineseOutput = runUserPromptSubmitHook({ hook_event_name: "UserPromptSubmit", prompt: "你好" });
		const englishOutput = runUserPromptSubmitHook({
			hook_event_name: "UserPromptSubmit",
			prompt: "Please continue.",
		});
		const payload = {
			hook_event_name: "UserPromptSubmit",
			prompt: "请继续",
			transcript_path: writeTranscript(chineseOutput, englishOutput),
		};

		// when
		const output = runUserPromptSubmitHook(payload);

		// then
		expect(languageFromHookOutput(output)).toBe("Chinese");
	});

	it("#given malformed input #when hook runs #then emits no output", () => {
		// given
		const payload = { hook_event_name: "UserPromptSubmit", prompt: 1 };

		// when
		const output = runUserPromptSubmitHook(payload);

		// then
		expect(output).toBe("");
	});
});

const temporaryDirectories: string[] = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

function writeTranscript(...lines: string[]): string {
	const directory = mkdtempSync(join(tmpdir(), "codex-language-transcript-"));
	temporaryDirectories.push(directory);
	const transcriptPath = join(directory, "transcript.jsonl");
	writeFileSync(transcriptPath, `${lines.join("\n")}\n`);
	return transcriptPath;
}

function languageFromHookOutput(output: string): string {
	const parsed: unknown = JSON.parse(output);
	if (!isHookOutput(parsed)) throw new TypeError("Expected UserPromptSubmit hook output");
	const match = /^<language-following>\nRespond to the user in ([^.]+)\./.exec(
		parsed.hookSpecificOutput.additionalContext,
	);
	if (match?.[1] === undefined) throw new TypeError("Expected language-following directive");
	return match[1];
}

function isHookOutput(value: unknown): value is {
	readonly hookSpecificOutput: { readonly hookEventName: "UserPromptSubmit"; readonly additionalContext: string };
} {
	if (!isRecord(value)) return false;
	const hookSpecificOutput = value["hookSpecificOutput"];
	return (
		isRecord(hookSpecificOutput) &&
		hookSpecificOutput["hookEventName"] === "UserPromptSubmit" &&
		typeof hookSpecificOutput["additionalContext"] === "string"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
