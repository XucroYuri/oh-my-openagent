import type { OhMyOpenCodeConfig, RuntimeFallbackConfig } from "../config"

/**
 * Detects whether any configured agent or category declares a non-empty
 * `fallback_models` chain.
 *
 * Both the model_fallback and runtime_fallback hooks ship disabled by default.
 * That means a user who configures fallback chains gets no runtime protection:
 * when the primary model fails (quota exceeded, out of credits, rate limited,
 * 429/503, ...) the error surfaces directly instead of degrading to the next
 * model in the chain. Auto-enabling these hooks when fallback chains are
 * present makes that protection opt-out instead of opt-in, while an explicit
 * `false` still disables it.
 */
export function hasFallbackModels(config: OhMyOpenCodeConfig | undefined | null): boolean {
  if (!config) return false
  const holders: ReadonlyArray<{ fallback_models?: unknown } | undefined> = [
    ...(config.agents ? Object.values(config.agents) : []),
    ...(config.categories ? Object.values(config.categories) : []),
  ]
  return holders.some((holder) => isNonEmptyFallbackModels(holder?.fallback_models))
}

function isNonEmptyFallbackModels(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return false
}

/**
 * Resolves whether the model_fallback hook should be enabled.
 *
 * - Explicit `model_fallback: true | false` always wins.
 * - Otherwise auto-enables when any fallback_models chain is configured.
 */
export function resolveModelFallbackEnabled(config: OhMyOpenCodeConfig): boolean {
  return config.model_fallback ?? hasFallbackModels(config)
}

/**
 * Resolves whether the runtime_fallback hook should be enabled.
 *
 * - `runtime_fallback: true | false` (boolean shorthand) always wins.
 * - `runtime_fallback.enabled` wins if set.
 * - Otherwise auto-enables when any fallback_models chain is configured.
 */
export function resolveRuntimeFallbackEnabled(config: OhMyOpenCodeConfig): boolean {
  if (typeof config.runtime_fallback === "boolean") return config.runtime_fallback
  return config.runtime_fallback?.enabled ?? hasFallbackModels(config)
}

/**
 * Builds the RuntimeFallbackConfig to hand to the runtime-fallback hook, with
 * `enabled` resolved via auto-enable so the hook's own
 * `options.config.enabled ?? DEFAULT` picks up the smart default instead of
 * falling back to the disabled default.
 */
export function resolveRuntimeFallbackConfig(config: OhMyOpenCodeConfig): RuntimeFallbackConfig {
  if (typeof config.runtime_fallback === "boolean") {
    return { enabled: config.runtime_fallback }
  }
  const userConfig = config.runtime_fallback ?? {}
  return { ...userConfig, enabled: resolveRuntimeFallbackEnabled(config) }
}
