import type { HookDeps } from "./types"
import { HOOK_NAME } from "./constants"
import { log } from "../../shared/logger"
import { createFallbackState, isModelInCooldown } from "./fallback-state"
import { parseModelString } from "../../shared/model-string-parser"

function modelWithoutVariant(modelStr: string): string {
  const parsed = parseModelString(modelStr)
  return parsed ? `${parsed.providerID}/${parsed.modelID}` : modelStr
}

export function createChatMessageHandler(deps: HookDeps) {
  const { config, sessionStates, sessionLastAccess } = deps

  return async (
    input: { sessionID: string; agent?: string; model?: { providerID: string; modelID: string } },
    output: { message: { model?: { providerID: string; modelID: string } }; parts?: Array<{ type: string; text?: string }> }
  ) => {
    if (!config.enabled) return

    const { sessionID } = input
    let state = sessionStates.get(sessionID)

    if (!state) return

    sessionLastAccess.set(sessionID, Date.now())

    const requestedModel = input.model
      ? `${input.model.providerID}/${input.model.modelID}`
      : undefined

    const normalizedPendingFallback = state.pendingFallbackModel
      ? modelWithoutVariant(state.pendingFallbackModel)
      : undefined

    if (requestedModel && normalizedPendingFallback && normalizedPendingFallback === requestedModel) {
      state.pendingFallbackModel = undefined
      state.pendingFallbackPromptMayHaveBeenAccepted = false
      return
    }

    if (requestedModel && requestedModel !== modelWithoutVariant(state.currentModel)) {
      log(`[${HOOK_NAME}] Detected manual model change, resetting fallback state`, {
        sessionID,
        from: state.currentModel,
        to: requestedModel,
      })
      state = createFallbackState(requestedModel)
      sessionStates.set(sessionID, state)
      return
    }

    if (
      config.restore_primary_after_cooldown &&
      state.currentModel !== state.originalModel &&
      !state.pendingFallbackModel &&
      !isModelInCooldown(state.originalModel, state, config.cooldown_seconds)
    ) {
      const activeModel = state.originalModel
      log(`[${HOOK_NAME}] Restoring preferred primary model`, {
        sessionID,
        from: state.currentModel,
        to: activeModel,
      })
      sessionStates.set(sessionID, createFallbackState(activeModel))

      const parts = activeModel.split("/")
      if (parts.length >= 2) {
        output.message.model = {
          providerID: parts[0],
          modelID: parts.slice(1).join("/"),
        }
      }
      return
    }

    const activeModel = state.currentModel

    if (activeModel === state.originalModel) return

    log(`[${HOOK_NAME}] Applying fallback model override`, {
      sessionID,
      from: input.model,
      to: activeModel,
    })

    if (output.message && activeModel) {
      const parsed = parseModelString(activeModel)
      if (parsed) {
        output.message.model = {
          providerID: parsed.providerID,
          modelID: parsed.modelID,
        }
      }
    }
  }
}
