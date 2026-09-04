import { detectLanguage } from "@oh-my-opencode/utils"
import type { ComponentContext, OmoSenpiComponent, SenpiExtensionAPI } from "../../extension/types"

const LANGUAGE_FOLLOWING_DISABLED_FLAG = "omo-senpi-language-following-disabled"
const LANGUAGE_DIRECTIVE_OPEN_TAG = "<language-following>"
const LANGUAGE_DIRECTIVE_CLOSE_TAG = "</language-following>"

interface SenpiInputEvent {
  type: "input"
  text: string
  images?: unknown[]
  source: "interactive" | "rpc" | "extension"
}

type SenpiInputEventResult =
  | { action: "continue" }
  | { action: "transform"; text: string; images?: unknown[] }
  | { action: "handled" }

export function createLanguageFollowingComponent(): OmoSenpiComponent {
  return {
    name: "language-following",
    register(pi: SenpiExtensionAPI, ctx: ComponentContext): void {
      pi.on("input", (payload: unknown): SenpiInputEventResult => handleInput(payload, ctx))
    },
  }
}

function buildDirective(languageName: string): string {
  return `${LANGUAGE_DIRECTIVE_OPEN_TAG}\nRespond to the user in ${languageName}. Match the user's input language for all conversational output regardless of the language of this codebase, prior turns, or these instructions. Keep code, identifiers, file paths, and command syntax unchanged.\n${LANGUAGE_DIRECTIVE_CLOSE_TAG}`
}

function handleInput(payload: unknown, ctx: ComponentContext): SenpiInputEventResult {
  if (ctx.config.getFlag(LANGUAGE_FOLLOWING_DISABLED_FLAG) === true) {
    return { action: "continue" }
  }

  if (!isSenpiInputEvent(payload)) {
    return { action: "continue" }
  }

  if (payload.source === "extension") {
    return { action: "continue" }
  }

  if (payload.text.includes(LANGUAGE_DIRECTIVE_OPEN_TAG) && payload.text.includes(LANGUAGE_DIRECTIVE_CLOSE_TAG)) {
    return { action: "continue" }
  }

  const detected = detectLanguage(payload.text)
  if (detected.code === "und") {
    return { action: "continue" }
  }

  return {
    action: "transform",
    text: `${buildDirective(detected.name)}\n${payload.text}`,
    images: payload.images,
  }
}

function isSenpiInputEvent(value: unknown): value is SenpiInputEvent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>
  if (candidate["type"] !== "input") {
    return false
  }

  if (typeof candidate["text"] !== "string" || candidate["text"].length === 0) {
    return false
  }

  return candidate["source"] === "interactive" || candidate["source"] === "rpc" || candidate["source"] === "extension"
}
