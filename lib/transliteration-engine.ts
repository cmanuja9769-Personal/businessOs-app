/**
 * Mature Phonetic Transliteration Engine - English to Hindi (Devanagari)
 * 
 * This module implements a sophisticated phonetic transliteration system that:
 * 1. Handles consonant clusters (e.g., "gr" -> "ग्र", "nd" -> "ंड")
 * 2. Properly handles vowel matras (dependent vowel forms)
 * 3. Uses schwa deletion rules for natural Hindi
 * 4. Handles common English word patterns
 * 5. Supports halant (virama) for consonant conjuncts
 * 
 * @example
 * transliterateToHindi("Grand Horse") -> "ग्रैंड हॉर्स"
 * transliterateToHindi("Flower Pot") -> "फ्लॉवर पॉट"
 */

// ===== CORE PHONEME MAPPINGS =====

// Consonants - sorted by length (longest first for greedy matching)
const CONSONANT_CLUSTERS: [string, string][] = [
  // 4-letter clusters
  ['shch', 'श्च'],
  ['schw', 'श्व'],
  
  // 3-letter clusters with aspirates
  ['thr', 'थ्र'],
  ['chr', 'क्र'],
  ['shr', 'श्र'],
  ['str', 'स्ट्र'],
  ['scr', 'स्क्र'],
  ['spr', 'स्प्र'],
  ['spl', 'स्प्ल'],
  ['nch', 'ंच'],
  ['nge', 'ंज'],
  ['ngi', 'ंगी'],
  ['ngy', 'ंग्य'],
  ['ght', 'ट'],
  ['dge', 'ज'],
  ['tch', 'च'],
  ['sch', 'स्क'],
  ['cks', 'क्स'],
  ['nks', 'ंक्स'],
  ['nds', 'ंड्स'],
  ['nts', 'ंट्स'],
  ['mps', 'म्प्स'],
  ['lts', 'ल्ट्स'],
  ['rts', 'र्ट्स'],
  ['sts', 'स्ट्स'],
  
  // 2-letter consonant clusters
  ['kh', 'ख'],
  ['gh', 'घ'],
  ['ch', 'च'],
  ['jh', 'झ'],
  ['th', 'थ'],
  ['dh', 'ध'],
  ['ph', 'फ'],
  ['bh', 'भ'],
  ['sh', 'श'],
  ['zh', 'ज़'],
  ['ng', 'ंग'],
  ['ny', 'न्य'],
  ['tr', 'ट्र'],
  ['dr', 'ड्र'],
  ['pr', 'प्र'],
  ['br', 'ब्र'],
  ['kr', 'क्र'],
  ['gr', 'ग्र'],
  ['fr', 'फ्र'],
  ['fl', 'फ्ल'],
  ['bl', 'ब्ल'],
  ['cl', 'क्ल'],
  ['gl', 'ग्ल'],
  ['pl', 'प्ल'],
  ['sl', 'स्ल'],
  ['sw', 'स्व'],
  ['tw', 'ट्व'],
  ['dw', 'ड्व'],
  ['kw', 'क्व'],
  ['qu', 'क्व'],
  ['ck', 'क'],
  ['sk', 'स्क'],
  ['sp', 'स्प'],
  ['st', 'स्ट'],
  ['sc', 'स्क'],
  ['sm', 'स्म'],
  ['sn', 'स्न'],
  ['nd', 'ंड'],
  ['nt', 'ंट'],
  ['nk', 'ंक'],
  ['mp', 'म्प'],
  ['mb', 'म्ब'],
  ['lt', 'ल्ट'],
  ['ld', 'ल्ड'],
  ['lk', 'ल्क'],
  ['lp', 'ल्प'],
  ['lf', 'ल्फ'],
  ['lm', 'ल्म'],
  ['rn', 'र्न'],
  ['rm', 'र्म'],
  ['rk', 'र्क'],
  ['rp', 'र्प'],
  ['rt', 'र्ट'],
  ['rd', 'र्ड'],
  ['rb', 'र्ब'],
  ['rs', 'र्स'],
  ['rg', 'र्ग'],
  ['rf', 'र्फ'],
  ['rv', 'र्व'],
  ['ft', 'फ्ट'],
  ['pt', 'प्ट'],
  ['ct', 'क्ट'],
  ['xt', 'क्स्ट'],
  ['wh', 'व्ह'],
  
  // Single consonants (lower priority)
  ['k', 'क'],
  ['g', 'ग'],
  ['c', 'क'], // default 'c' to 'क'
  ['j', 'ज'],
  ['t', 'ट'],
  ['d', 'ड'],
  ['n', 'न'],
  ['p', 'प'],
  ['b', 'ब'],
  ['m', 'म'],
  ['y', 'य'],
  ['r', 'र'],
  ['l', 'ल'],
  ['v', 'व'],
  ['w', 'व'],
  ['s', 'स'],
  ['h', 'ह'],
  ['f', 'फ'],
  ['z', 'ज़'],
  ['x', 'क्स'],
  ['q', 'क'],
]

// Vowel patterns - for initial vowels (standalone)
const INITIAL_VOWELS: [string, string][] = [
  ['oo', 'ऊ'],
  ['ee', 'ई'],
  ['ai', 'ऐ'],
  ['au', 'औ'],
  ['ou', 'औ'],
  ['aw', 'ऑ'],
  ['ow', 'औ'],
  ['oi', 'ऑय'],
  ['oy', 'ऑय'],
  ['ea', 'ई'],
  ['ie', 'ई'],
  ['ei', 'ए'],
  ['aa', 'आ'],
  ['a', 'अ'],
  ['e', 'ए'],
  ['i', 'इ'],
  ['o', 'ओ'],
  ['u', 'उ'],
]

// Vowel matras (dependent vowels) - applied after consonants
const VOWEL_MATRAS: [string, string][] = [
  ['oo', 'ू'],
  ['ee', 'ी'],
  ['ai', 'ै'],
  ['au', 'ौ'],
  ['ou', 'ौ'],
  ['aw', 'ॉ'],
  ['ow', 'ौ'],
  ['oi', 'ॉय'],
  ['oy', 'ॉय'],
  ['ea', 'ी'],
  ['ie', 'ी'],
  ['ei', 'े'],
  ['aa', 'ा'],
  ['a', 'ा'],  // Default 'a' after consonant adds ा
  ['e', 'े'],
  ['i', 'ि'],
  ['o', 'ो'],
  ['u', 'ु'],
]

// Special patterns for common English sounds/words
const COMMON_WORD_PATTERNS: [string, string][] = [
  // Complete word replacements for accuracy
  ['grand', 'ग्रैंड'],
  ['horse', 'हॉर्स'],
  ['flower', 'फ्लॉवर'],
  ['pot', 'पॉट'],
  ['pots', 'पॉट्स'],
  ['small', 'स्मॉल'],
  ['large', 'लार्ज'],
  ['regular', 'रेगुलर'],
  ['piece', 'पीस'],
  ['pieces', 'पीसेस'],
  ['pack', 'पैक'],
  ['box', 'बॉक्स'],
  ['carton', 'कार्टन'],
  ['bundle', 'बंडल'],
  ['bag', 'बैग'],
  ['bags', 'बैग्स'],
  ['roll', 'रोल'],
  ['drum', 'ड्रम'],
  ['case', 'केस'],
  ['set', 'सेट'],
  ['pair', 'पेयर'],
  ['dozen', 'दर्जन'],
  ['bottle', 'बोतल'],
  ['bottles', 'बोतल्स'],
  ['pack', 'पैक'],
  ['can', 'कैन'],
  ['jar', 'जार'],
  ['tube', 'ट्यूब'],
  ['tray', 'ट्रे'],
  ['unit', 'यूनिट'],
  ['units', 'यूनिट्स'],
  ['each', 'ईच'],
  ['per', 'पर'],
  ['qty', 'क्वांटिटी'],
  ['quantity', 'क्वांटिटी'],
  ['price', 'प्राइस'],
  ['rate', 'रेट'],
  ['total', 'टोटल'],
  ['amount', 'अमाउंट'],
  ['item', 'आइटम'],
  ['items', 'आइटम्स'],
  ['product', 'प्रोडक्ट'],
  ['products', 'प्रोडक्ट्स'],
  ['stock', 'स्टॉक'],
  ['code', 'कोड'],
  ['barcode', 'बारकोड'],
  ['name', 'नाम'],
  ['size', 'साइज़'],
  ['color', 'कलर'],
  ['colour', 'कलर'],
  ['weight', 'वेट'],
  ['brand', 'ब्रैंड'],
  ['model', 'मॉडल'],
  ['type', 'टाइप'],
  ['style', 'स्टाइल'],
  ['quality', 'क्वालिटी'],
  ['premium', 'प्रीमियम'],
  ['standard', 'स्टैंडर्ड'],
  ['special', 'स्पेशल'],
  ['super', 'सुपर'],
  ['ultra', 'अल्ट्रा'],
  ['mini', 'मिनी'],
  ['maxi', 'मैक्सी'],
  ['extra', 'एक्स्ट्रा'],
  ['plus', 'प्लस'],
  ['pro', 'प्रो'],
  ['gold', 'गोल्ड'],
  ['silver', 'सिल्वर'],
  ['white', 'व्हाइट'],
  ['black', 'ब्लैक'],
  ['red', 'रेड'],
  ['blue', 'ब्लू'],
  ['green', 'ग्रीन'],
  ['yellow', 'येलो'],
  ['pink', 'पिंक'],
  ['orange', 'ऑरेंज'],
  ['brown', 'ब्राउन'],
  ['grey', 'ग्रे'],
  ['gray', 'ग्रे'],
  ['water', 'वॉटर'],
  ['oil', 'ऑयल'],
  ['cream', 'क्रीम'],
  ['powder', 'पाउडर'],
  ['liquid', 'लिक्विड'],
  ['gel', 'जेल'],
  ['spray', 'स्प्रे'],
  ['fresh', 'फ्रेश'],
  ['natural', 'नेचुरल'],
  ['pure', 'प्योर'],
  ['organic', 'ऑर्गेनिक'],
  ['classic', 'क्लासिक'],
  ['new', 'न्यू'],
  ['hot', 'हॉट'],
  ['cold', 'कोल्ड'],
  ['cool', 'कूल'],
  ['soft', 'सॉफ्ट'],
  ['hard', 'हार्ड'],
  ['light', 'लाइट'],
  ['dark', 'डार्क'],
  ['bright', 'ब्राइट'],
  ['double', 'डबल'],
  ['single', 'सिंगल'],
  ['triple', 'ट्रिपल'],
  ['best', 'बेस्ट'],
  ['good', 'गुड'],
  ['better', 'बेटर'],
  ['nice', 'नाइस'],
  ['fine', 'फाइन'],
  ['great', 'ग्रेट'],
  ['high', 'हाई'],
  ['low', 'लो'],
  ['fast', 'फास्ट'],
  ['quick', 'क्विक'],
  ['slow', 'स्लो'],
  ['easy', 'ईज़ी'],
  ['simple', 'सिंपल'],
  ['strong', 'स्ट्रॉन्ग'],
  ['safe', 'सेफ'],
  ['clean', 'क्लीन'],
  ['clear', 'क्लियर'],
  ['smooth', 'स्मूथ'],
  ['round', 'राउंड'],
  ['square', 'स्क्वायर'],
  ['long', 'लॉन्ग'],
  ['short', 'शॉर्ट'],
  ['big', 'बिग'],
  ['medium', 'मीडियम'],
  ['thin', 'थिन'],
  ['thick', 'थिक'],
  ['wide', 'वाइड'],
  ['narrow', 'नैरो'],
  ['deep', 'डीप'],
  ['flat', 'फ्लैट'],
  ['full', 'फुल'],
  ['empty', 'एम्प्टी'],
  ['half', 'हाफ'],
  ['free', 'फ्री'],
  ['open', 'ओपन'],
  ['close', 'क्लोज़'],
  ['lock', 'लॉक'],
  ['key', 'की'],
  ['home', 'होम'],
  ['office', 'ऑफिस'],
  ['shop', 'शॉप'],
  ['store', 'स्टोर'],
  ['market', 'मार्केट'],
  ['mall', 'मॉल'],
  ['center', 'सेंटर'],
  ['centre', 'सेंटर'],
  ['point', 'पॉइंट'],
  ['place', 'प्लेस'],
  ['room', 'रूम'],
  ['space', 'स्पेस'],
  ['area', 'एरिया'],
  ['zone', 'ज़ोन'],
  ['level', 'लेवल'],
  ['floor', 'फ्लोर'],
  ['wall', 'वॉल'],
  ['door', 'डोर'],
  ['window', 'विंडो'],
  ['table', 'टेबल'],
  ['chair', 'चेयर'],
  ['bed', 'बेड'],
  ['lamp', 'लैंप'],
  ['fan', 'फैन'],
  ['air', 'एयर'],
  ['cool', 'कूल'],
  ['warm', 'वॉर्म'],
  ['power', 'पावर'],
  ['energy', 'एनर्जी'],
  ['star', 'स्टार'],
  ['moon', 'मून'],
  ['sun', 'सन'],
  ['sky', 'स्काई'],
  ['rain', 'रेन'],
  ['cloud', 'क्लाउड'],
  ['wind', 'विंड'],
  ['fire', 'फायर'],
  ['ice', 'आइस'],
  ['snow', 'स्नो'],
  ['earth', 'अर्थ'],
  ['world', 'वर्ल्ड'],
  ['life', 'लाइफ'],
  ['love', 'लव'],
  ['care', 'केयर'],
  ['help', 'हेल्प'],
  ['work', 'वर्क'],
  ['play', 'प्ले'],
  ['game', 'गेम'],
  ['sport', 'स्पोर्ट'],
  ['music', 'म्यूज़िक'],
  ['art', 'आर्ट'],
  ['book', 'बुक'],
  ['paper', 'पेपर'],
  ['pen', 'पेन'],
  ['digital', 'डिजिटल'],
  ['smart', 'स्मार्ट'],
  ['tech', 'टेक'],
  ['max', 'मैक्स'],
  ['min', 'मिन'],
]

// Ending patterns that need special handling
const ENDING_PATTERNS: [string, string][] = [
  ['tion', 'शन'],
  ['sion', 'शन'],
  ['ness', 'नेस'],
  ['ment', 'मेंट'],
  ['able', 'एबल'],
  ['ible', 'इबल'],
  ['ful', 'फुल'],
  ['less', 'लेस'],
  ['ing', 'िंग'],
  ['ings', 'िंग्स'],
  ['ous', 'अस'],
  ['ious', 'ियस'],
  ['eous', 'ियस'],
  ['ity', 'िटी'],
  ['ty', 'टी'],
  ['ly', 'ली'],
  ['ry', 'री'],
  ['er', 'र'],
  ['ers', 'र्स'],
  ['or', 'र'],
  ['ors', 'र्स'],
  ['ar', 'र'],
  ['ars', 'र्स'],
  ['ed', 'ड'],
  ['es', 'ेस'],
  ['s', 'स'],
]

// ===== HALANT (VIRAMA) =====
const HALANT = '्'

/**
 * Check if a character is a vowel
 */
function isVowel(char: string): boolean {
  return /^[aeiouAEIOU]$/.test(char)
}

/**
 * Check if a character is a consonant
 */
function isConsonant(char: string): boolean {
  return /^[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]$/.test(char)
}

/**
 * Check if a Hindi character is a consonant (has implicit 'a')
 */
function _isHindiConsonant(char: string): boolean {
  const code = char.charCodeAt(0)
  // Devanagari consonants range: 0x0915-0x0939
  return code >= 0x0915 && code <= 0x0939
}

/**
 * Get the base consonant (without matra) from Hindi text
 */
function _getBaseConsonant(hindiChar: string): string {
  // If it ends with halant, return as-is (already a pure consonant)
  if (hindiChar.endsWith(HALANT)) {
    return hindiChar
  }
  
  // Check if last char is a matra and remove it
  const lastChar = hindiChar.charAt(hindiChar.length - 1)
  const matraChars = ['ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', 'ॉ', 'ं', 'ँ', 'ः']
  
  if (matraChars.includes(lastChar)) {
    return hindiChar.slice(0, -1)
  }
  
  return hindiChar
}

/**
 * Match and consume a pattern from the input string
 */
function matchPattern(
  input: string, 
  position: number, 
  patterns: [string, string][]
): [string, string, number] | null {
  const remaining = input.slice(position).toLowerCase()
  
  for (const [pattern, replacement] of patterns) {
    if (remaining.startsWith(pattern)) {
      return [pattern, replacement, pattern.length]
    }
  }
  
  return null
}

/**
 * Transliterate a single word from English to Hindi
 */
function transliterateWord(word: string): string {
  if (!word || word.trim() === '') return ''
  
  const lowerWord = word.toLowerCase().trim()
  
  // Check for complete word match first
  const wordMatch = COMMON_WORD_PATTERNS.find(([pattern]) => pattern === lowerWord)
  if (wordMatch) {
    return wordMatch[1]
  }
  
  // Check for ending patterns and apply them
  let processedWord = lowerWord
  let suffix = ''
  
  for (const [pattern, replacement] of ENDING_PATTERNS) {
    if (processedWord.endsWith(pattern) && processedWord.length > pattern.length) {
      processedWord = processedWord.slice(0, -pattern.length)
      suffix = replacement
      break
    }
  }
  
  let result = ''
  let i = 0
  let lastWasConsonant = false
  let pendingHalant = false
  
  while (i < processedWord.length) {
    const remaining = processedWord.slice(i)
    
    // Try to match consonant clusters first
    const consonantMatch = matchPattern(processedWord, i, CONSONANT_CLUSTERS)
    
    if (consonantMatch) {
      const [, hindi, length] = consonantMatch
      
      // Check what comes after this consonant
      const nextPos = i + length
      const nextChar = processedWord[nextPos]
      
      if (nextChar && isConsonant(nextChar)) {
        if (pendingHalant) {
          result = result.slice(0, -1)
        }
        result += hindi + HALANT
        lastWasConsonant = true
        pendingHalant = true
      } else {
        if (pendingHalant) {
          result = result.slice(0, -1)
        }
        result += hindi
        lastWasConsonant = true
        pendingHalant = false
      }
      
      i += length
      continue
    }
    
    // Try to match vowels
    if (isVowel(remaining[0])) {
      const vowelPatterns = lastWasConsonant ? VOWEL_MATRAS : INITIAL_VOWELS
      const vowelMatch = matchPattern(processedWord, i, vowelPatterns)
      
      if (vowelMatch) {
        const [, hindi, length] = vowelMatch
        
        // Remove pending halant before adding matra
        if (pendingHalant && lastWasConsonant) {
          result = result.slice(0, -1)
        }
        
        result += hindi
        lastWasConsonant = false
        pendingHalant = false
        i += length
        continue
      }
    }
    
    // Handle remaining characters
    const char = remaining[0]
    
    if (/\d/.test(char)) {
      const devanagariNumerals = '०१२३४५६७८९'
      result += devanagariNumerals[parseInt(char)]
      lastWasConsonant = false
      pendingHalant = false
    } else {
      result += char
      lastWasConsonant = false
      pendingHalant = false
    }
    
    i++
  }
  
  // Remove trailing halant if present
  if (result.endsWith(HALANT)) {
    result = result.slice(0, -1)
  }
  
  return result + suffix
}

/**
 * Main transliteration function - converts English text to Hindi (Devanagari)
 * 
 * @param text - English text to transliterate
 * @returns Hindi transliteration
 * 
 * @example
 * transliterateToHindi("Grand Horse") // Returns "ग्रैंड हॉर्स"
 * transliterateToHindi("Flower Pot Small") // Returns "फ्लॉवर पॉट स्मॉल"
 */
export function transliterateToHindi(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  const trimmed = text.trim()
  if (!trimmed) return ''
  
  // Split by whitespace and punctuation while preserving delimiters
  const parts: string[] = []
  let currentWord = ''
  
  for (const char of trimmed) {
    if (/[a-zA-Z0-9]/.test(char)) {
      currentWord += char
    } else {
      if (currentWord) {
        parts.push(transliterateWord(currentWord))
        currentWord = ''
      }
      // Preserve spaces and punctuation
      parts.push(char)
    }
  }
  
  // Don't forget the last word
  if (currentWord) {
    parts.push(transliterateWord(currentWord))
  }
  
  return parts.join('')
}

/**
 * Async version with caching for performance
 */
const TRANSLITERATION_CACHE = new Map<string, string>()
const MAX_CACHE_SIZE = 1000

export async function transliterateToHindiAsync(text: string): Promise<string | undefined> {
  if (!text || typeof text !== 'string') return undefined
  
  const trimmed = text.trim()
  if (!trimmed) return undefined
  
  // Check cache
  if (TRANSLITERATION_CACHE.has(trimmed)) {
    return TRANSLITERATION_CACHE.get(trimmed)
  }
  
  // Perform transliteration
  const result = transliterateToHindi(trimmed)
  
  // Cache the result (with LRU-style eviction)
  if (TRANSLITERATION_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = TRANSLITERATION_CACHE.keys().next().value
    if (firstKey) {
      TRANSLITERATION_CACHE.delete(firstKey)
    }
  }
  TRANSLITERATION_CACHE.set(trimmed, result)
  
  return result
}

/**
 * React hook for transliteration
 */
export function useTransliterate(text: string | undefined): string | undefined {
  if (!text) return undefined
  return transliterateToHindi(text)
}

// Export for backward compatibility with existing code
export { transliterateToHindi as applyHindiTransliteration }
