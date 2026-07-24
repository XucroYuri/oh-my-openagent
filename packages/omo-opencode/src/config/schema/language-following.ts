import { z } from "zod"

export const LanguageFollowingConfigSchema = z.object({
  /** Make agents mirror the developer's input language in CLI conversation. Default true. */
  enabled: z.boolean().default(true),
  /**
   * Lock responses to a fixed language (e.g. "en", "zh", "ja", "ko") instead of
   * following the detected input language. When unset, the language is detected
   * from the most recent user message on every turn.
   */
  locale: z.string().optional(),
})

export type LanguageFollowingConfig = z.infer<typeof LanguageFollowingConfigSchema>
