const TRANSLATE_CACHE_NAMESPACE = "translate:hi"
const TRANSLATE_CACHE_VERSION = 3
const TRANSLATE_CACHE_VERSION_KEY = `${TRANSLATE_CACHE_NAMESPACE}:__version`

let hasInitializedTranslateCache = false

function applyHindiCorrections(source: string, translated: string): string {
  const trimmedSource = (source || "").trim()
  let result = (translated || "").trim()
  if (!trimmedSource || !result) return result

  // Domain-specific corrections
  const lowerSource = trimmedSource.toLowerCase()
  const corrections = [{ en: "plain", wrong: "मैदान", right: "प्लेन" }]

  for (const { en, wrong, right } of corrections) {
    if (lowerSource.includes(en) && result.includes(wrong)) {
      result = result.replace(new RegExp(wrong, "g"), right)
    }
  }

  return result
}

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

export async function translateToHindi(text: string): Promise<string | undefined> {
  const trimmed = (text || "").trim()
  if (!trimmed) return undefined

  // Only run in the browser
  if (typeof window === "undefined") return undefined

  initTranslateCache()

  const cacheKey = `${TRANSLATE_CACHE_NAMESPACE}:v${TRANSLATE_CACHE_VERSION}:${trimmed}`

  try {
    const cached = window.localStorage.getItem(cacheKey)
    if (cached) {
      const corrected = applyHindiCorrections(trimmed, cached)
      if (corrected && corrected !== cached) {
        try {
          window.localStorage.setItem(cacheKey, corrected)
        } catch {
          // ignore cache failures
        }
      }
      return corrected || cached
    }
  } catch {
    // ignore cache failures
  }

  const tryLibreTranslate = async () => {
    // Free, public LibreTranslate instance (no API key).
    // Note: public instances may rate-limit; we fail gracefully.
    const endpoint = "https://libretranslate.de/translate"
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 3500)

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          q: trimmed,
          source: "en",
          target: "hi",
          format: "text",
        }),
        signal: controller.signal,
      })

      if (!res.ok) return undefined
      const json = (await res.json()) as { translatedText?: string }
      const translated = (json.translatedText || "").trim()
      return translated || undefined
    } catch {
      return undefined
    } finally {
      window.clearTimeout(timeout)
    }
  }

  const tryMyMemory = async () => {
    // Free tier. May rate limit; we fail gracefully.
    const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|hi`
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 3500)

    try {
      const res = await fetch(endpoint, { method: "GET", signal: controller.signal })
      if (!res.ok) return undefined
      const json = (await res.json()) as { responseData?: { translatedText?: string } }
      const translated = (json.responseData?.translatedText || "").trim()
      return translated || undefined
    } catch {
      return undefined
    } finally {
      window.clearTimeout(timeout)
    }
  }

  let translated = (await tryLibreTranslate()) || (await tryMyMemory())
  if (!translated) return undefined

  translated = applyHindiCorrections(trimmed, translated)

  try {
    window.localStorage.setItem(cacheKey, translated)
  } catch {
    // ignore cache failures
  }

  return translated
}
