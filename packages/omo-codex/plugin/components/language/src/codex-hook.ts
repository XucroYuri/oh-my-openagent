import { readFileSync } from "node:fs";

import { detectLanguage } from "./detect-language.js";

export const LANGUAGE_FOLLOWING_DIRECTIVE_TAG = "<language-following>";

const TRANSCRIPT_SEARCH_BYTES = 512_000;
const RESPONSE_PREFIX = "\nRespond to the user in ";

export type CodexUserPromptSubmitInput = {
	readonly hook_event_name: "UserPromptSubmit";
	readonly prompt: string;
	readonly transcript_path?: string | null;
};

type UserPromptSubmitHookOutput = {
	readonly hookSpecificOutput: {
		readonly hookEventName: "UserPromptSubmit";
		readonly additionalContext: string;
	};
};

export function runUserPromptSubmitHook(input: unknown): string {
	if (!isCodexUserPromptSubmitInput(input)) return "";

	const language = detectLanguage(input.prompt);
	if (language.code === "und") return "";
	if (lastLanguageFollowingDirectiveInTranscript(input.transcript_path) === language.name) return "";

	return formatAdditionalContextOutput(buildLanguageFollowingDirective(language.name));
}

export function buildLanguageFollowingDirective(languageName: string): string {
	return `${LANGUAGE_FOLLOWING_DIRECTIVE_TAG}\nRespond to the user in ${languageName}. Match the user's input language for all conversational output regardless of the language of this codebase, prior turns, or these instructions. Keep code, identifiers, file paths, and command syntax unchanged.\n</language-following>`;
}

function lastLanguageFollowingDirectiveInTranscript(transcriptPath: string | null | undefined): string | null {
	if (transcriptPath === undefined || transcriptPath === null) return null;

	try {
		let lastLanguage: string | null = null;
		for (const line of readTranscriptTail(transcriptPath).split(/\r?\n/)) {
			const language = languageFromHookOutputLine(line);
			if (language !== null) lastLanguage = language;
		}
		return lastLanguage;
	} catch {
		return null;
	}
}

function readTranscriptTail(transcriptPath: string): string {
	const rawTranscript = readFileSync(transcriptPath);
	return rawTranscript.subarray(Math.max(0, rawTranscript.byteLength - TRANSCRIPT_SEARCH_BYTES)).toString("utf8");
}

function languageFromHookOutputLine(line: string): string | null {
	const parsed = parseJsonLine(line);
	if (!isRecord(parsed)) return null;

	const hookSpecificOutput = parsed["hookSpecificOutput"];
	if (!isRecord(hookSpecificOutput)) return null;
	if (hookSpecificOutput["hookEventName"] !== "UserPromptSubmit") return null;
	if (typeof hookSpecificOutput["additionalContext"] !== "string") return null;

	return languageFromDirective(hookSpecificOutput["additionalContext"]);
}

function languageFromDirective(additionalContext: string): string | null {
	const tagIndex = additionalContext.lastIndexOf(LANGUAGE_FOLLOWING_DIRECTIVE_TAG);
	if (tagIndex === -1) return null;

	const directive = additionalContext.slice(tagIndex);
	if (!directive.startsWith(`${LANGUAGE_FOLLOWING_DIRECTIVE_TAG}${RESPONSE_PREFIX}`)) return null;

	const languageStart = LANGUAGE_FOLLOWING_DIRECTIVE_TAG.length + RESPONSE_PREFIX.length;
	const languageEnd = directive.indexOf(".", languageStart);
	if (languageEnd === -1) return null;

	const language = directive.slice(languageStart, languageEnd);
	return language.length > 0 ? language : null;
}

function formatAdditionalContextOutput(additionalContext: string): string {
	const output: UserPromptSubmitHookOutput = {
		hookSpecificOutput: {
			hookEventName: "UserPromptSubmit",
			additionalContext,
		},
	};
	return `${JSON.stringify(output)}\n`;
}

function parseJsonLine(line: string): unknown | null {
	if (line.trim().length === 0) return null;

	try {
		return JSON.parse(line);
	} catch {
		return null;
	}
}

function isCodexUserPromptSubmitInput(value: unknown): value is CodexUserPromptSubmitInput {
	return (
		isRecord(value) &&
		value["hook_event_name"] === "UserPromptSubmit" &&
		typeof value["prompt"] === "string" &&
		(value["transcript_path"] === undefined ||
			value["transcript_path"] === null ||
			typeof value["transcript_path"] === "string")
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
