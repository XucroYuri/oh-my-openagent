# Language Component

## Style

- TypeScript strict mode. No `any`, `@ts-ignore`, `@ts-expect-error`, enums, or non-null assertions.
- Runtime is Node only because Codex launches plugin hooks with Node.
- Use ESM imports with `.js` suffixes and tabs for indentation.

## Constraints

- The hook reads stdin JSON, writes one `hookSpecificOutput.additionalContext` JSON line when it detects a language, and always exits 0.
- Never make network calls or block a Codex turn.
- Keep language detection self-contained. Do not import OMO runtime packages into the built component.
- Suppress only a repeat of the last injected language directive. A changed input language must inject a new directive.
