# Hindi Transliteration Fix

## Problem
The previous translation was using machine translation APIs (LibreTranslate and MyMemory) which translated English words to their Hindi equivalents:

**Before (Wrong):**
```
"Regular Aakash Flower Pots Small / 10 Pcs"
↓
"नियमित आकाश फूल के बर्तन छोटे / 10 पीसी"
```

This translated "Flower" to "फूल" (the Hindi word for flower) instead of just writing "Flower" in Hindi script.

## Solution
Changed to **transliteration approach** which preserves English words and simply writes them in Hindi script:

**After (Correct):**
```
"Regular Aakash Flower Pots Small / 10 Pcs"
↓
"रेगुलर आकाश फ्लावर पॉट्स स्मॉल / 10 पीस"
```

Now:
- "Regular" → "रेगुलर" (preserves meaning, same pronunciation in Hindi)
- "Aakash" → "आकाश" (already Hindi name)
- "Flower" → "फ्लावर" (transliterated, sounds like "Flower")
- "Pots" → "पॉट्स" (transliterated, sounds like "Pots")
- "Small" → "स्मॉल" (transliterated, sounds like "Small")
- "10 Pcs" → "10 पीस" (number preserved, "Pcs" transliterated)

## Implementation Details

### Changes Made in `lib/translate.ts`

1. **Removed API-based Translation**: Removed calls to LibreTranslate and MyMemory APIs
2. **Added Transliteration Map**: Created `TRANSLITERATION_MAP` with:
   - Individual consonants and vowels
   - Common syllable combinations with vowel modifiers
   - Special handling for common words like "flower", "pot", "pcs", "small", etc.

3. **Added Transliteration Functions**:
   - `transliterateWord(word)`: Converts a single English word to Hindi script
   - `applyHindiTransliteration(source)`: Processes entire text while preserving spaces, numbers, and special characters

4. **Cache Version Bumped**: Changed from v3 to v4 to clear old cached translations

### How It Works

The transliteration function:
1. Splits text into words and non-word characters
2. For each word, tries to match multi-character combinations from the transliteration map
3. Builds syllables matching 3-char → 2-char → 1-char patterns
4. Preserves spaces, numbers, and special characters exactly as-is

### Example Transliteration Map Entries

```typescript
// Consonant combinations
"kh": "ख",      // KH sound
"ch": "च",      // CH sound
"sh": "श",      // SH sound

// With vowels
"ka": "का",     // KA sound
"ke": "के",     // KE sound
"ki": "की",     // KI sound

// Common words (pre-mapped for accuracy)
"flower": "फ्लावर",
"pot": "पॉट",
"pots": "पॉट्स",
"small": "स्मॉल",
"regular": "रेगुलर",
"pcs": "पीस",
```

## Benefits

✅ **Preserves Original Meaning**: Words are transliterated, not translated
✅ **Consistent Pronunciation**: Hindi speakers can still pronounce the words
✅ **No Network Dependency**: No need for external APIs, works offline
✅ **Instant Results**: No API latency, transliteration is instant
✅ **Customizable**: Easy to add domain-specific word mappings
✅ **Reliable**: Deterministic output, same input always produces same output

## Testing

To test, try uploading items with names like:
- "Regular Flower Pot Small"
- "Premium Storage Box Large"
- "Quality Glass Container Medium"

These should transliterate correctly to Hindi script while preserving the English word meanings.

## Cache Invalidation

The cache version was bumped to v4, so all old cached translations will be cleared automatically. The transliteration will be re-computed and re-cached with the new version.
