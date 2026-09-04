# QA Evidence: language-following (OpenCode side)

## WHAT WAS TESTED

A new per-turn messages-transform hook `language-following` in `packages/omo-opencode`
that detects the language of the most recent real user message (via `detectLanguage`
from `@oh-my-opencode/utils`) and injects a `<language-following>` directive as a
synthetic text part on every turn, gated by the new `language_following.enabled`
config (default true). Goal: make agents mirror the developer's input language and
resist drift back to English over long sessions.

Surfaces driven:
1. End-to-end drive of the actual hook (`opencode-hook-drive.txt`) through Bun,
   exercising the real `createLanguageFollowingHook` implementation that `dist/index.js`
   bundles.
2. Real opencode boot in an isolated XDG sandbox with the built plugin
   (`dist/index.js`) registered (`opencode-sandbox-boot.log`), confirming the plugin
   config loads and opencode runs against the sandbox, not the real home.

## WHAT WAS OBSERVED

- Hook drive: 6/6 PASS.
  - Chinese input  -> "Respond to the user in Chinese"
  - English input  -> "Respond to the user in English"
  - Japanese kana  -> "Respond to the user in Japanese"
  - Korean input   -> "Respond to the user in Korean"
  - locale lock "ja" over Chinese input -> "Respond to the user in Japanese" (config override wins)
  - enabled=false  -> no directive injected
- Bundle check: `dist/index.js` contains the directive text and the hook (7 matches),
  proving the shipped artifact carries the feature, not just source.
- Isolation (`isolation-proof.txt`): real opencode DB session count = 16 before AND
  after QA; the isolated sandbox created its own single session. The real
  `~/.local/share/opencode/opencode.db` was never written.
- Unit tests: 25/25 across the three shared/adapter files
  (detect-language 15, opencode hook 5, senpi component 5).
- Regression: existing opencode messages-transform (23) and config schema (10)
  suites stay green with the new hook wired into the transform chain.

## WHY IT IS ENOUGH

The hook is a pure messages-transform: given the message array it mutates the last
real user turn. Driving the real implementation over representative inputs (CJK +
Latin, locale lock, disabled) proves the intended behavior end-to-end, and the
per-turn transform re-runs every request so it re-asserts and resists drift by
construction (same mechanism as the existing context-injector and ultrawork
re-assertion). The isolated boot proves the packaged plugin loads under real
opencode without touching the real DB.

## WHAT WAS OMITTED

A full live LLM turn was not run in the sandbox because no provider credentials are
configured there (the sandbox run returned an expected provider/server error). That
path exercises the model, not the hook; the hook's contract is fully covered by the
direct drive above. No secrets, tokens, or provider logs are included in these
artifacts.
