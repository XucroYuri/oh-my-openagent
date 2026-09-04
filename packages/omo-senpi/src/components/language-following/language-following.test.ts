/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test"

import { FakeExtensionAPI } from "../../../test-support/fake-extension-api"
import type { ComponentContext, ComponentLogger } from "../../extension/types"
import { createLanguageFollowingComponent } from "./index"

function createTestContext(pi: FakeExtensionAPI): ComponentContext {
  const logger: ComponentLogger = {
    info() {},
    warn() {},
    error() {},
  }

  return {
    logger,
    config: {
      getFlag(name) {
        return pi.getFlag(name)
      },
    },
  }
}

async function dispatchInput(pi: FakeExtensionAPI, text: unknown, source: unknown = "interactive"): Promise<unknown> {
  const [result] = await pi.dispatch("input", {
    type: "input",
    text,
    source,
  })
  return result
}

function transformedText(result: unknown): string {
  expect(result).toMatchObject({ action: "transform" })
  if (typeof result !== "object" || result === null || !("text" in result)) {
    throw new Error("expected transform result with text")
  }
  const text = result.text
  if (typeof text !== "string") {
    throw new Error("expected transformed text to be a string")
  }
  return text
}

describe("language-following component", () => {
  function setup(): FakeExtensionAPI {
    const pi = new FakeExtensionAPI()
    const component = createLanguageFollowingComponent()
    component.register(pi, createTestContext(pi))
    return pi
  }

  it("prepends a Chinese directive for Chinese input", async () => {
    // given
    const pi = setup()

    // when
    const result = await dispatchInput(pi, "先评估这个项目再动手")

    // then
    const text = transformedText(result)
    expect(text).toContain("Respond to the user in Chinese")
    expect(text.endsWith("先评估这个项目再动手")).toBe(true)
  })

  it("prepends an English directive for English input", async () => {
    // given
    const pi = setup()

    // when
    const result = await dispatchInput(pi, "assess the project first")

    // then
    expect(transformedText(result)).toContain("Respond to the user in English")
  })

  it("continues without transform for undetermined input", async () => {
    // given
    const pi = setup()

    // when
    const result = await dispatchInput(pi, "12345 !@#$%")

    // then
    expect(result).toMatchObject({ action: "continue" })
  })

  it("continues when the directive tag pair is already present", async () => {
    // given
    const pi = setup()

    // when
    const result = await dispatchInput(pi, "<language-following>\nx\n</language-following>\n先评估")

    // then
    expect(result).toMatchObject({ action: "continue" })
  })

  it("continues for extension-sourced input", async () => {
    // given
    const pi = setup()

    // when
    const result = await dispatchInput(pi, "先评估这个项目", "extension")

    // then
    expect(result).toMatchObject({ action: "continue" })
  })
})
