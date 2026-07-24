# QA Evidence: language-following (Senpi adapter)

## WHAT WAS TESTED

A new Senpi component `language-following` in `packages/omo-senpi/src/components/language-following/`
that hooks `pi.on("input", ...)`, detects the language of the user's input text via
`detectLanguage` from `@oh-my-opencode/utils`, and returns
`{ action: "transform", text: "<language-following>...</language-following>\n<original>" }`
so every turn re-asserts "respond in the developer's input language". Registered in the
extension component list in `src/extension/index.ts`.

## WHAT WAS OBSERVED

- Component unit tests: 5/5 PASS (`component-tests.txt`): Chinese -> Chinese directive,
  English -> English directive, undetermined input -> continue (no transform), directive
  tag pair already present -> continue (no double injection), extension-sourced input ->
  continue.
- Extension composition + bundle-purity suites: 25/25 PASS across 7 files; adding the
  component did not break `composeOmoSenpiExtension` wiring or violate the harness-neutral
  bundle-purity constraint (detectLanguage comes from the neutral utils core).
- Bundle proof (`bundle-proof.txt`): the generated `plugin/extensions/omo.js` contains the
  directive text (1 match) and the component is registered in `extension/index.ts` (2 refs:
  import + list entry), proving the component ships in the built Senpi extension.
- Typecheck: `tsgo --noEmit -p packages/omo-senpi/tsconfig.json` clean.

## WHY IT IS ENOUGH

The Senpi input transform is a pure function over the input event; driving it over
representative inputs (CJK + Latin, undetermined, dedupe, extension source) covers the
contract. The `input` event fires every turn, so the directive re-asserts and resists
drift by construction, matching the ultrawork component's proven injection mechanism.
The extension-bundle grep proves the component is actually included in the artifact Senpi
loads.

## WHAT WAS OMITTED

A full live Senpi RPC drive (`scripts/qa/drive.mjs`) was not run here because it requires a
Senpi binary on PATH; the component's behavior is fully covered by the direct unit drive and
the bundle-inclusion proof. No secrets or provider logs are included.
