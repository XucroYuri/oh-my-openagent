export interface DetectedLanguage {
  readonly code: string
  readonly name: string
}

const UNDETERMINED: DetectedLanguage = { code: "und", name: "the user's language" }

const SCRIPT_LANGUAGES: Record<string, DetectedLanguage> = {
  hangul: { code: "ko", name: "Korean" },
  kana: { code: "ja", name: "Japanese" },
  han: { code: "zh", name: "Chinese" },
  cyrillic: { code: "ru", name: "Russian" },
  arabic: { code: "ar", name: "Arabic" },
  hebrew: { code: "he", name: "Hebrew" },
  thai: { code: "th", name: "Thai" },
  devanagari: { code: "hi", name: "Hindi" },
  greek: { code: "el", name: "Greek" },
  latin: { code: "en", name: "English" },
}

type ScriptKey = keyof typeof SCRIPT_LANGUAGES

function classifyCodePoint(codePoint: number): ScriptKey | null {
  if (codePoint >= 0xac00 && codePoint <= 0xd7a3) return "hangul"
  if (codePoint >= 0x1100 && codePoint <= 0x11ff) return "hangul"
  if (codePoint >= 0x3130 && codePoint <= 0x318f) return "hangul"
  if (codePoint >= 0x3040 && codePoint <= 0x30ff) return "kana"
  if (codePoint >= 0x4e00 && codePoint <= 0x9fff) return "han"
  if (codePoint >= 0x3400 && codePoint <= 0x4dbf) return "han"
  if (codePoint >= 0x0400 && codePoint <= 0x04ff) return "cyrillic"
  if (codePoint >= 0x0600 && codePoint <= 0x06ff) return "arabic"
  if (codePoint >= 0x0590 && codePoint <= 0x05ff) return "hebrew"
  if (codePoint >= 0x0e00 && codePoint <= 0x0e7f) return "thai"
  if (codePoint >= 0x0900 && codePoint <= 0x097f) return "devanagari"
  if (codePoint >= 0x0370 && codePoint <= 0x03ff) return "greek"
  if (codePoint >= 0x0041 && codePoint <= 0x024f) return "latin"
  return null
}

export function detectLanguage(text: string): DetectedLanguage {
  if (!text) return UNDETERMINED

  const counts = new Map<ScriptKey, number>()
  for (const char of text) {
    const codePoint = char.codePointAt(0)
    if (codePoint === undefined) continue
    const script = classifyCodePoint(codePoint)
    if (script === null) continue
    counts.set(script, (counts.get(script) ?? 0) + 1)
  }

  if (counts.size === 0) return UNDETERMINED

  const kanaCount = counts.get("kana") ?? 0
  if (kanaCount > 0) return SCRIPT_LANGUAGES.kana

  let dominant: ScriptKey | null = null
  let dominantCount = 0
  for (const [script, count] of counts) {
    if (count > dominantCount) {
      dominant = script
      dominantCount = count
    }
  }

  if (dominant === null) return UNDETERMINED
  return SCRIPT_LANGUAGES[dominant]
}
