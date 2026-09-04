import type { Message, Part } from "@opencode-ai/sdk"
import { detectLanguage } from "@oh-my-opencode/utils"
import { isRealUserMessage, isRealUserTextPart } from "../../shared"
import type { LanguageFollowingConfig } from "../../config/schema/language-following"

const LANGUAGE_DIRECTIVE_TAG = "<language-following>"

interface MessageWithParts {
  info: Message
  parts: Part[]
}

type MessagesTransformHook = {
  "experimental.chat.messages.transform"?: (
    input: Record<string, never>,
    output: { messages: MessageWithParts[] },
  ) => Promise<void>
}

const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  zh: "Chinese",
  "zh-cn": "Simplified Chinese",
  "zh-tw": "Traditional Chinese",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  ar: "Arabic",
  he: "Hebrew",
  th: "Thai",
  hi: "Hindi",
  el: "Greek",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  "pt-br": "Brazilian Portuguese",
  tr: "Turkish",
  pl: "Polish",
  nl: "Dutch",
  vi: "Vietnamese",
  id: "Indonesian",
}

function resolveLanguageName(config: LanguageFollowingConfig, userText: string): string {
  if (config.locale) {
    const normalized = config.locale.trim().replace(/_/g, "-").toLowerCase()
    return LOCALE_NAMES[normalized] ?? LOCALE_NAMES[normalized.split("-")[0]] ?? config.locale
  }
  return detectLanguage(userText).name
}

function buildDirective(languageName: string): string {
  return `${LANGUAGE_DIRECTIVE_TAG}\nRespond to the user in ${languageName}. Match the user's input language for all conversational output regardless of the language of this codebase, prior turns, or these instructions. Keep code, identifiers, file paths, and command syntax unchanged.\n</language-following>`
}

function collectUserText(parts: Part[]): string {
  const segments: string[] = []
  for (const part of parts) {
    if (isRealUserTextPart(part) && typeof part.text === "string") {
      segments.push(part.text)
    }
  }
  return segments.join(" ")
}

export function createLanguageFollowingHook(
  config: LanguageFollowingConfig,
): MessagesTransformHook {
  return {
    "experimental.chat.messages.transform": async (_input, output) => {
      if (config.enabled === false) return

      const { messages } = output
      if (messages.length === 0) return

      let lastUserIndex = -1
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index]?.info.role === "user") {
          lastUserIndex = index
          break
        }
      }
      if (lastUserIndex === -1) return

      const lastUserMessage = messages[lastUserIndex]
      if (lastUserMessage === undefined || !isRealUserMessage(lastUserMessage)) return

      const textPartIndex = lastUserMessage.parts.findIndex(
        (part) => isRealUserTextPart(part) && typeof part.text === "string" && part.text.length > 0,
      )
      if (textPartIndex === -1) return

      const userText = collectUserText(lastUserMessage.parts)
      const languageName = resolveLanguageName(config, userText)
      const directive = buildDirective(languageName)

      const messageSessionID =
        "sessionID" in lastUserMessage.info && typeof lastUserMessage.info.sessionID === "string"
          ? lastUserMessage.info.sessionID
          : ""

      const syntheticPart = {
        id: `prt_language_following_${lastUserMessage.info.id}`,
        messageID: lastUserMessage.info.id,
        sessionID: messageSessionID,
        type: "text" as const,
        text: directive,
        synthetic: true,
      }

      lastUserMessage.parts.splice(textPartIndex, 0, syntheticPart as Part)
    },
  }
}
