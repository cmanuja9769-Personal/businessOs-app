const TRANSLATE_CACHE_NAMESPACE = "translate:hi"
const TRANSLATE_CACHE_VERSION = 4 // Bumped version to clear old cache
const TRANSLATE_CACHE_VERSION_KEY = `${TRANSLATE_CACHE_NAMESPACE}:__version`

let hasInitializedTranslateCache = false

// Transliteration map for English to Hindi script
const TRANSLITERATION_MAP: Record<string, string> = {
  // Consonants
  "k": "क", "kh": "ख", "g": "ग", "gh": "घ", "ng": "ङ",
  "ch": "च", "chh": "छ", "j": "ज", "jh": "झ", "ny": "ञ",
  "t": "ट", "th": "ठ", "d": "ड", "dh": "ढ", "n": "ण",
  "p": "प", "ph": "फ", "b": "ब", "bh": "भ", "m": "म",
  "y": "य", "r": "र", "l": "ल", "w": "व", "sh": "श", "s": "स", "h": "ह",
  
  // Vowels (standalone)
  "a": "आ", "e": "ए", "i": "इ", "o": "ओ", "u": "उ",
  "ai": "ऐ", "au": "औ",
  
  // With vowel modifiers
  "ka": "का", "ke": "के", "ki": "की", "ko": "को", "ku": "कु",
  "kha": "खा", "khe": "खे", "khi": "खी", "kho": "खो", "khu": "खु",
  "ga": "गा", "ge": "गे", "gi": "गी", "go": "गो", "gu": "गु",
  "pa": "पा", "pe": "पे", "pi": "पी", "po": "पो", "pu": "पु",
  "ra": "रा", "re": "रे", "ri": "री", "ro": "रो", "ru": "रु",
  "ta": "टा", "te": "टे", "ti": "टी", "to": "टो", "tu": "टु",
  "la": "ला", "le": "ले", "li": "ली", "lo": "लो", "lu": "लु",
  "sa": "सा", "se": "से", "si": "सी", "so": "सो", "su": "सु",
  "ha": "हा", "he": "हे", "hi": "ही", "ho": "हो", "hu": "हु",
  "ba": "बा", "be": "बे", "bi": "बी", "bo": "बो", "bu": "बु",
  "da": "डा", "de": "डे", "di": "डी", "do": "डो", "du": "डु",
  "ma": "मा", "me": "मे", "mi": "मी", "mo": "मो", "mu": "मु",
  "va": "वा", "ve": "वे", "vi": "वी", "vo": "वो", "vu": "वु",
  "fa": "फा", "fe": "फे", "fi": "फी", "fo": "फो", "fu": "फु",
  
  // Common word patterns
  "flower": "फ्लावर",
  "pot": "पॉट",
  "pots": "पॉट्स",
  "small": "स्मॉल",
  "large": "लार्ज",
  "regular": "रेगुलर",
  "pcs": "पीस",
  "pc": "पीस",
  "piece": "पीस",
  "pieces": "पीस",
  "qty": "क्यूटी",
  "quantity": "क्वांटिटी",
}

// Simple transliteration function
function transliterateWord(word: string): string {
  const lowerWord = word.toLowerCase()
  
  // Check if exact match exists in transliteration map
  if (TRANSLITERATION_MAP[lowerWord]) {
    return TRANSLITERATION_MAP[lowerWord]
  }
  
  // For longer words, try to build from syllables
  let result = ""
  let i = 0
  
  while (i < lowerWord.length) {
    let matched = false
    
    // Try 3-character combinations first
    if (i + 3 <= lowerWord.length) {
      const chunk3 = lowerWord.slice(i, i + 3)
      if (TRANSLITERATION_MAP[chunk3]) {
        result += TRANSLITERATION_MAP[chunk3]
        i += 3
        matched = true
      }
    }
    
    // Try 2-character combinations
    if (!matched && i + 2 <= lowerWord.length) {
      const chunk2 = lowerWord.slice(i, i + 2)
      if (TRANSLITERATION_MAP[chunk2]) {
        result += TRANSLITERATION_MAP[chunk2]
        i += 2
        matched = true
      }
    }
    
    // Try single character
    if (!matched && i + 1 <= lowerWord.length) {
      const chunk1 = lowerWord.slice(i, i + 1)
      if (TRANSLITERATION_MAP[chunk1]) {
        result += TRANSLITERATION_MAP[chunk1]
        i += 1
        matched = true
      } else {
        // Keep character as-is if not in map
        result += chunk1
        i += 1
      }
    }
  }
  
  return result
}

function applyHindiTransliteration(source: string): string {
  const trimmedSource = (source || "").trim()
  if (!trimmedSource) return ""
  
  // Split by spaces and numbers/special chars to preserve format
  const parts: string[] = []
  let currentWord = ""
  
  for (const char of trimmedSource) {
    if (/[a-zA-Z]/.test(char)) {
      currentWord += char
    } else {
      if (currentWord) {
        parts.push(transliterateWord(currentWord))
        currentWord = ""
      }
      parts.push(char)
    }
  }
  
  if (currentWord) {
    parts.push(transliterateWord(currentWord))
  }
  
  return parts.join("")
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
      return cached
    }
  } catch {
    // ignore cache failures
  }

  // Use transliteration instead of machine translation
  // This preserves English words in Hindi script format
  const transliterated = applyHindiTransliteration(trimmed)
  
  if (!transliterated) return undefined

  try {
    window.localStorage.setItem(cacheKey, transliterated)
  } catch {
    // ignore cache failures
  }

  return transliterated
}
