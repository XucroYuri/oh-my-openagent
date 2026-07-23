import { describe, expect, test } from "bun:test"
import type { OhMyOpenCodeConfig } from "../config"
import {
  hasFallbackModels,
  resolveModelFallbackEnabled,
  resolveRuntimeFallbackConfig,
  resolveRuntimeFallbackEnabled,
} from "./fallback-models-presence"

function config(partial: Partial<OhMyOpenCodeConfig> = {}): OhMyOpenCodeConfig {
  return partial as OhMyOpenCodeConfig
}

describe("hasFallbackModels", () => {
  test("returns false for empty config", () => {
    // given
    const cfg = config()

    // when
    const result = hasFallbackModels(cfg)

    // then
    expect(result).toBe(false)
  })

  test("returns false when agents have no fallback_models", () => {
    // given
    const cfg = config({ agents: { sisyphus: { model: "openai/gpt-5.6-sol" } } })

    // when
    const result = hasFallbackModels(cfg)

    // then
    expect(result).toBe(false)
  })

  test("returns true when an agent has a non-empty fallback_models array", () => {
    // given
    const cfg = config({
      agents: { sisyphus: { model: "openai/gpt-5.6-sol", fallback_models: ["openai/gpt-5.4"] } },
    })

    // when
    const result = hasFallbackModels(cfg)

    // then
    expect(result).toBe(true)
  })

  test("returns true when a category has object-form fallback_models", () => {
    // given
    const cfg = config({
      categories: {
        quick: { model: "openai/gpt-5.4-mini", fallback_models: [{ model: "openai/gpt-5-nano" }] },
      },
    })

    // when
    const result = hasFallbackModels(cfg)

    // then
    expect(result).toBe(true)
  })

  test("returns false for an empty fallback_models array", () => {
    // given
    const cfg = config({ agents: { sisyphus: { fallback_models: [] } } })

    // when
    const result = hasFallbackModels(cfg)

    // then
    expect(result).toBe(false)
  })

  test("returns true for a single-string fallback_models", () => {
    // given
    const cfg = config({ agents: { sisyphus: { fallback_models: "openai/gpt-5.4" } } })

    // when
    const result = hasFallbackModels(cfg)

    // then
    expect(result).toBe(true)
  })
})

describe("resolveModelFallbackEnabled", () => {
  test("explicit true wins even without fallback_models", () => {
    // given
    const cfg = config({ model_fallback: true })

    // when
    const result = resolveModelFallbackEnabled(cfg)

    // then
    expect(result).toBe(true)
  })

  test("explicit false wins even when fallback_models present", () => {
    // given
    const cfg = config({
      model_fallback: false,
      agents: { sisyphus: { fallback_models: ["openai/gpt-5.4"] } },
    })

    // when
    const result = resolveModelFallbackEnabled(cfg)

    // then
    expect(result).toBe(false)
  })

  test("auto-enables when unset and fallback_models present", () => {
    // given
    const cfg = config({ agents: { sisyphus: { fallback_models: ["openai/gpt-5.4"] } } })

    // when
    const result = resolveModelFallbackEnabled(cfg)

    // then
    expect(result).toBe(true)
  })

  test("stays off when unset and no fallback_models", () => {
    // given
    const cfg = config()

    // when
    const result = resolveModelFallbackEnabled(cfg)

    // then
    expect(result).toBe(false)
  })
})

describe("resolveRuntimeFallbackEnabled", () => {
  test("boolean shorthand true wins", () => {
    expect(resolveRuntimeFallbackEnabled(config({ runtime_fallback: true }))).toBe(true)
  })

  test("boolean shorthand false wins even with fallback_models", () => {
    // given
    const cfg = config({
      runtime_fallback: false,
      agents: { sisyphus: { fallback_models: ["openai/gpt-5.4"] } },
    })

    // when
    expect(resolveRuntimeFallbackEnabled(cfg)).toBe(false)
  })

  test("object enabled false wins even with fallback_models", () => {
    // given
    const cfg = config({
      runtime_fallback: { enabled: false },
      agents: { sisyphus: { fallback_models: ["openai/gpt-5.4"] } },
    })

    // when
    expect(resolveRuntimeFallbackEnabled(cfg)).toBe(false)
  })

  test("auto-enables when unset and fallback_models present", () => {
    // given
    const cfg = config({ agents: { sisyphus: { fallback_models: ["openai/gpt-5.4"] } } })

    // when
    expect(resolveRuntimeFallbackEnabled(cfg)).toBe(true)
  })

  test("stays off when unset and no fallback_models", () => {
    expect(resolveRuntimeFallbackEnabled(config())).toBe(false)
  })
})

describe("resolveRuntimeFallbackConfig", () => {
  test("boolean shorthand produces enabled-only config", () => {
    // given
    const cfg = config({ runtime_fallback: true })

    // when
    const result = resolveRuntimeFallbackConfig(cfg)

    // then
    expect(result).toEqual({ enabled: true })
  })

  test("preserves user-set fields and resolves enabled via auto-enable", () => {
    // given
    const cfg = config({
      runtime_fallback: { max_fallback_attempts: 5, cooldown_seconds: 30 },
      agents: { sisyphus: { fallback_models: ["openai/gpt-5.4"] } },
    })

    // when
    const result = resolveRuntimeFallbackConfig(cfg)

    // then
    expect(result).toEqual({ max_fallback_attempts: 5, cooldown_seconds: 30, enabled: true })
  })

  test("object enabled false is preserved (not auto-enabled)", () => {
    // given
    const cfg = config({
      runtime_fallback: { enabled: false },
      agents: { sisyphus: { fallback_models: ["openai/gpt-5.4"] } },
    })

    // when
    const result = resolveRuntimeFallbackConfig(cfg)

    // then
    expect(result).toEqual({ enabled: false })
  })

  test("stays disabled when unset and no fallback_models", () => {
    // given
    const cfg = config()

    // when
    const result = resolveRuntimeFallbackConfig(cfg)

    // then
    expect(result).toEqual({ enabled: false })
  })
})
