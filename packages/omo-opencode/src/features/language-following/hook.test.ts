import { describe, expect, test } from "bun:test"
import type { Message, Part } from "@opencode-ai/sdk"
import { createLanguageFollowingHook } from "./hook"

type MessageWithParts = { info: Message; parts: Part[] }

function userTurn(text: string, id = "msg_user"): MessageWithParts {
  return {
    info: {
      id,
      sessionID: "ses_test",
      role: "user",
      time: { created: 1 },
    } as unknown as Message,
    parts: [
      {
        id: `${id}_text`,
        messageID: id,
        sessionID: "ses_test",
        type: "text",
        text,
      } as unknown as Part,
    ],
  }
}

function injectedText(message: MessageWithParts): string {
  return message.parts
    .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
    .join("\n")
}

describe("createLanguageFollowingHook", () => {
  test("injects a Chinese directive for Chinese input", async () => {
    // given
    const hook = createLanguageFollowingHook({ enabled: true })
    const message = userTurn("先评估这个项目再给我建议")
    const output = { messages: [message] }

    // when
    await hook["experimental.chat.messages.transform"]?.({} as never, output)

    // then
    expect(injectedText(message)).toContain("Respond to the user in Chinese")
  })

  test("injects an English directive for English input", async () => {
    // given
    const hook = createLanguageFollowingHook({ enabled: true })
    const message = userTurn("assess the project and advise me")
    const output = { messages: [message] }

    // when
    await hook["experimental.chat.messages.transform"]?.({} as never, output)

    // then
    expect(injectedText(message)).toContain("Respond to the user in English")
  })

  test("honors a locked locale over detected input language", async () => {
    // given
    const hook = createLanguageFollowingHook({ enabled: true, locale: "ja" })
    const message = userTurn("先评估这个项目")
    const output = { messages: [message] }

    // when
    await hook["experimental.chat.messages.transform"]?.({} as never, output)

    // then
    expect(injectedText(message)).toContain("Respond to the user in Japanese")
  })

  test("does nothing when disabled", async () => {
    // given
    const hook = createLanguageFollowingHook({ enabled: false })
    const message = userTurn("先评估这个项目")
    const output = { messages: [message] }

    // when
    await hook["experimental.chat.messages.transform"]?.({} as never, output)

    // then
    expect(injectedText(message)).not.toContain("Respond to the user")
  })

  test("does nothing when there is no user message", async () => {
    // given
    const hook = createLanguageFollowingHook({ enabled: true })
    const assistant: MessageWithParts = {
      info: { id: "a", sessionID: "ses_test", role: "assistant", time: { created: 1 } } as unknown as Message,
      parts: [],
    }
    const output = { messages: [assistant] }

    // when
    await hook["experimental.chat.messages.transform"]?.({} as never, output)

    // then
    expect(output.messages).toHaveLength(1)
  })
})
