import { describe, expect, test } from "bun:test"
import { detectLanguage } from "./detect-language"

describe("detectLanguage", () => {
  describe("single-script detection", () => {
    test.each([
      ["detects Chinese Han text", "先评估当前项目给我你的认识", "zh", "Chinese"],
      ["detects Korean Hangul text", "현재 프로젝트를 평가해줘", "ko", "Korean"],
      ["detects Japanese kana text", "プロジェクトを評価してください", "ja", "Japanese"],
      ["detects English Latin text", "assess the current project for me", "en", "English"],
      ["detects Russian Cyrillic text", "оцените текущий проект", "ru", "Russian"],
      ["detects Arabic text", "قيم المشروع الحالي", "ar", "Arabic"],
      ["detects Thai text", "ประเมินโครงการปัจจุบัน", "th", "Thai"],
      ["detects Greek text", "αξιολογηστε το εργο", "el", "Greek"],
    ] as const)("%s", (_label, text, code, name) => {
      // when
      const result = detectLanguage(text)

      // then
      expect(result.code).toBe(code)
      expect(result.name).toBe(name)
    })
  })

  describe("Japanese vs Chinese disambiguation", () => {
    test("treats kanji-with-kana as Japanese even when Han outnumbers kana", () => {
      // given: many kanji, few kana
      const text = "評価報告書を確認した"

      // when
      const result = detectLanguage(text)

      // then
      expect(result.code).toBe("ja")
    })

    test("treats pure Han text as Chinese", () => {
      // given
      const text = "评估当前项目质量"

      // when
      const result = detectLanguage(text)

      // then
      expect(result.code).toBe("zh")
    })
  })

  describe("mixed-script dominance", () => {
    test("picks the dominant non-latin script over incidental latin", () => {
      // given: mostly Chinese with an English tool name
      const text = "评估这个项目使用 opencode 的架构分层设计合理性"

      // when
      const result = detectLanguage(text)

      // then
      expect(result.code).toBe("zh")
    })

    test("returns English when latin dominates", () => {
      // given
      const text = "assess project 项目"

      // when
      const result = detectLanguage(text)

      // then
      expect(result.code).toBe("en")
    })
  })

  describe("undetermined input", () => {
    test.each([
      ["returns undetermined for empty string", ""],
      ["returns undetermined for whitespace only", "   \n\t  "],
      ["returns undetermined for digits and punctuation only", "12345 !@#$% -->"],
    ] as const)("%s", (_label, text) => {
      // when
      const result = detectLanguage(text)

      // then
      expect(result.code).toBe("und")
      expect(result.name).toBe("the user's language")
    })
  })
})
