# Codex language following QA

## What was tested

- `npm test` in `packages/omo-codex/plugin/components/language`: unit coverage for Chinese, English, Japanese kana, Korean, empty and punctuation-only prompts, malformed payloads, and latest-directive transcript deduplication. Output: `language-component-tests.txt`.
- `npm run typecheck` in the language component: strict Node TypeScript compilation. Output: `language-component-typecheck.txt`.
- `npm run typecheck` in `packages/omo-codex/plugin/components/lsp`: validates the CWD-independent LSP package-smoke test. Output: `lsp-package-typecheck.txt`.
- `bun run test:codex` with a temporary PATH shim that maps `python3` to the installed Python 3.11, because the host default Python 3.9 lacks `tomllib`. Output: `test-codex.txt`.
- Isolated local install: `CODEX_HOME="$(mktemp -d)/codex" node packages/omo-codex/scripts/install-local.mjs install`, with telemetry disabled. The installed language CLI received a Chinese `UserPromptSubmit` payload. Outputs: `isolated-install-local.txt`, `installed-language-hook-output.json`, and `isolated-install-assertions.json`.
- Live Codex proof: `.agents/skills/codex-qa/scripts/app-server-drive.sh --plugin --prompt "请用中文回复：确认语言注入已启用。" --expect "sessionStart,userPromptSubmit"`. Output: `app-server-live-hook.json`.

## What was observed

- The language component unit suite passed 10 tests. Strict TypeScript typechecking passed for the language and LSP component scopes.
- The Codex gate passed: 510 passed, 0 failed, 3 skipped. The three skips are the no-Bun wrapper cases whose premise is false on this host because an absolute fallback Bun path is installed.
- The isolated installer enabled `omo@sisyphuslabs`, copied `components/language/dist/cli.js`, and the installed hook emitted one UserPromptSubmit `additionalContext` JSON line containing a Chinese language-following directive.
- The real `~/.codex/config.toml` SHA-256 was identical before and after the manual isolated install. The app-server driver independently reported that the real config remained unchanged and that `sessionStart` and `userPromptSubmit` hooks completed.
- LSP diagnostics could not start because the configured Biome LSP binary is not installed. Installation was not authorized. The scoped strict TypeScript check is recorded above.

## Why this is enough

- Unit tests cover script detection and per-language deduplication semantics.
- The local install test proves the shipped cache artifact, enabled sandbox configuration, and exact hook JSON output.
- The real app-server run proves Codex loaded the local plugin and completed the UserPromptSubmit hook in an isolated home without contacting a real model API.
- The full Codex gate covers aggregate hook registration, self-contained bundled CLIs, packaging, installer behavior, and the component suite.

## What was omitted

- Raw environment dumps, credentials, authentication headers, and telemetry payloads were omitted. Telemetry was disabled for the manual isolated install.
