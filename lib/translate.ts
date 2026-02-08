/**
 * Hindi Translation/Transliteration Module
 * 
 * Uses the sophisticated transliteration engine for phonetically accurate
 * English to Hindi (Devanagari) conversion.
 * 
 * @see lib/transliteration-engine.ts for the core transliteration logic
 */

import { 
  transliterateToHindi, 
  useTransliterate,
  applyHindiTransliteration 
} from './transliteration-engine'

const TRANSLATE_CACHE_NAMESPACE = "translate:hi"
const TRANSLATE_CACHE_VERSION = 5 // Bumped version to clear old cache after engine upgrade
const TRANSLATE_CACHE_VERSION_KEY = `${TRANSLATE_CACHE_NAMESPACE}:__version`

let hasInitializedTranslateCache = false

// Re-export the hook for convenience
export { useTransliterate }

function initTranslateCache() {
  if (hasInitializedTranslateCache) return
  hasInitializedTranslateCache = true

  if (typeof window === "undefined") return

  try {
    const current = window.localStorage.getItem(TRANSLATE_CACHE_VERSION_KEY)
    if (current === String(TRANSLATE_CACHE_VERSION)) return

    // Best-effort clear of all cached translations in this namespace.
    // We iterate backwards since localStorage keys shift as we remove.
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith(`${TRANSLATE_CACHE_NAMESPACE}:`)) {
        window.localStorage.removeItem(key)
      }
    }
    window.localStorage.setItem(TRANSLATE_CACHE_VERSION_KEY, String(TRANSLATE_CACHE_VERSION))
  } catch {
    // ignore cache failures
  }
}

/**
 * Translate/Transliterate text to Hindi with caching
 * 
 * @param text - English text to convert
 * @returns Promise resolving to Hindi transliteration
 * 
 * @example
 * const hindi = await translateToHindi("Grand Horse")
 * // Returns "ग्रैंड हॉर्स"
 */
export async function translateToHindi(text: string): Promise<string | undefined> {
  const trimmed = (text || "").trim()
  if (!trimmed) return undefined

  // Only run in the browser
  if (typeof window === "undefined") {
    // Server-side: use direct transliteration without caching
    return transliterateToHindi(trimmed)
  }

  initTranslateCache()

  const cacheKey = `${TRANSLATE_CACHE_NAMESPACE}:v${TRANSLATE_CACHE_VERSION}:${trimmed}`

  try {
    const cached = window.localStorage.getItem(cacheKey)
    if (cached) {
      return cached
    }
  } catch {
    // ignore cache failures
  }

  // Use the new sophisticated transliteration engine
  const transliterated = transliterateToHindi(trimmed)
  
  if (!transliterated) return undefined

  try {
    window.localStorage.setItem(cacheKey, transliterated)
  } catch {
    // ignore cache failures
  }

  return transliterated
}

// Export synchronous version for non-async contexts
export { transliterateToHindi, applyHindiTransliteration }
