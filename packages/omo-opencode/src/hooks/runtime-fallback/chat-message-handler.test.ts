import { describe, expect, test } from "bun:test"

import { createChatMessageHandler } from "./chat-message-handler"
import { createFallbackState } from "./fallback-state"
import type { HookDeps } from "./types"

function createDeps(): HookDeps {
  return {
    ctx: {
      client: {
        session: {},
        tui: {},
      },
      directory: "/test/dir",
    },
    config: {
      enabled: true,
      retry_on_errors: [429, 503, 529],
      max_fallback_attempts: 3,
      cooldown_seconds: 0,
      timeout_seconds: 30,
      notify_on_fallback: true,
      restore_primary_after_cooldown: false,
    },
    options: undefined,
    pluginConfig: undefined,
    sessionStates: new Map(),
    sessionLastAccess: new Map(),
    sessionRetryInFlight: new Set(),
    sessionAwaitingFallbackResult: new Set(),
    sessionFallbackTimeouts: new Map(),
    sessionStatusRetryKeys: new Map(),
    internallyAbortedSessions: new Set(),
  }
}

describe("createChatMessageHandler runtime fallback model override", () => {
  test("#given session is on an accepted fallback #when a later user message is transformed after cooldown #then it stays on the fallback model", async () => {
    // given
    const deps = createDeps()
    const sessionID = "session-active-fallback"
    const state = createFallbackState("openai/gpt-5.4")
    state.currentModel = "litellm/openai.eu.gpt-5.5"
    state.fallbackIndex = 0
    state.failedModels.set("openai/gpt-5.4", Date.now() - 60_000)
    deps.sessionStates.set(sessionID, state)
    const handler = createChatMessageHandler(deps)
    const output: { message: { model?: { providerID: string; modelID: string } } } = { message: {} }

    // when
    await handler(
      {
        sessionID,
        model: {
          providerID: "litellm",
          modelID: "openai.eu.gpt-5.5",
        },
      },
      output,
    )

    // then
    expect(output.message.model).toEqual({
      providerID: "litellm",
      modelID: "openai.eu.gpt-5.5",
    })
    expect(deps.sessionStates.get(sessionID)?.currentModel).toBe("litellm/openai.eu.gpt-5.5")
  })

  test("#given fallback model carries a variant suffix #when a later chat.message arrives without the variant #then the pending fallback is consumed and state is preserved", async () => {
    // given — fallback dispatch stored currentModel/pendingFallbackModel with a
    // variant suffix "opencode-go/kimi-k3(max)", but OpenCode's chat.message
    // input.model only carries {providerID, modelID} (no variant).
    const deps = createDeps()
    const sessionID = "session-variant-fallback"
    const state = createFallbackState("openrouter/anthropic/claude-opus-4.8")
    state.currentModel = "opencode-go/kimi-k3(max)"
    state.fallbackIndex = 0
    state.pendingFallbackModel = "opencode-go/kimi-k3(max)"
    deps.sessionStates.set(sessionID, state)
    const handler = createChatMessageHandler(deps)
    const output: { message: { model?: { providerID: string; modelID: string } } } = { message: {} }

    // when
    await handler(
      {
        sessionID,
        model: { providerID: "opencode-go", modelID: "kimi-k3" },
      },
      output,
    )

    // then — pending fallback is consumed and the fallback state is preserved.
    // Regression: previously the variant-suffix mismatch was misread as a manual
    // model change, resetting state every 30s and stalling the session.
    const nextState = deps.sessionStates.get(sessionID)
    expect(nextState?.currentModel).toBe("opencode-go/kimi-k3(max)")
    expect(nextState?.pendingFallbackModel).toBeUndefined()
  })
})
