// Official HSN (Harmonized System of Nomenclature) codes from GST Portal
// Source: https://tutorial.gst.gov.in/downloads/HSN_SAC.xlsx
// Total: 21,789 codes covering all product categories

export interface HSNCode {
  code: string
  description: string
  category: string
  gstRate?: number // Default GST rate for the category
}

// Chapter to Category mapping based on HSN classification
const CHAPTER_CATEGORIES: Record<string, string> = {
  '01': 'Live Animals', '02': 'Meat', '03': 'Fish & Seafood', '04': 'Dairy Products',
  '05': 'Animal Products', '06': 'Plants & Flowers', '07': 'Vegetables', '08': 'Fruits & Nuts',
  '09': 'Coffee, Tea & Spices', '10': 'Cereals', '11': 'Milling Products', '12': 'Oil Seeds',
  '13': 'Lac, Gums & Resins', '14': 'Vegetable Materials', '15': 'Fats & Oils', '16': 'Meat Preparations',
  '17': 'Sugar & Confectionery', '18': 'Cocoa & Chocolate', '19': 'Cereal Preparations', '20': 'Vegetable Preparations',
  '21': 'Food Preparations', '22': 'Beverages', '23': 'Food Waste & Animal Feed', '24': 'Tobacco',
  '25': 'Salt, Minerals & Cement', '26': 'Ores & Slag', '27': 'Petroleum & Coal', '28': 'Inorganic Chemicals',
  '29': 'Organic Chemicals', '30': 'Pharmaceuticals', '31': 'Fertilizers', '32': 'Dyes & Pigments',
  '33': 'Essential Oils & Cosmetics', '34': 'Soap & Detergents', '35': 'Proteins & Enzymes',
  '36': 'Explosives & Fireworks', '37': 'Photographic Materials', '38': 'Chemical Products',
  '39': 'Plastics', '40': 'Rubber', '41': 'Hides & Skins', '42': 'Leather Articles',
  '43': 'Furskins', '44': 'Wood & Wood Products', '45': 'Cork', '46': 'Basketware',
  '47': 'Paper Pulp', '48': 'Paper & Paperboard', '49': 'Printed Books & Newspapers',
  '50': 'Silk', '51': 'Wool', '52': 'Cotton', '53': 'Vegetable Textile Fibres',
  '54': 'Man-made Filaments', '55': 'Man-made Staple Fibres', '56': 'Wadding & Felt',
  '57': 'Carpets', '58': 'Special Woven Fabrics', '59': 'Textile Fabrics', '60': 'Knitted Fabrics',
  '61': 'Knitted Apparel', '62': 'Woven Apparel', '63': 'Textile Articles', '64': 'Footwear',
  '65': 'Headgear', '66': 'Umbrellas', '67': 'Feathers & Flowers', '68': 'Stone & Cement Products',
  '69': 'Ceramic Products', '70': 'Glass', '71': 'Precious Metals & Jewellery', '72': 'Iron & Steel',
  '73': 'Iron & Steel Articles', '74': 'Copper', '75': 'Nickel', '76': 'Aluminium',
  '78': 'Lead', '79': 'Zinc', '80': 'Tin', '81': 'Other Base Metals',
  '82': 'Tools & Cutlery', '83': 'Metal Articles', '84': 'Machinery', '85': 'Electronics',
  '86': 'Railway Equipment', '87': 'Vehicles', '88': 'Aircraft', '89': 'Ships & Boats',
  '90': 'Optical & Medical Instruments', '91': 'Clocks & Watches', '92': 'Musical Instruments',
  '93': 'Arms & Ammunition', '94': 'Furniture', '95': 'Toys & Sports', '96': 'Miscellaneous',
  '97': 'Art & Antiques', '98': 'Special Transactions', '99': 'Services'
}

// Default GST rates by chapter (common rates - actual rates may vary by specific item)
const CHAPTER_GST_RATES: Record<string, number> = {
  '01': 0, '02': 5, '03': 5, '04': 5, '05': 5, '06': 0, '07': 0, '08': 0,
  '09': 5, '10': 0, '11': 0, '12': 5, '13': 5, '14': 5, '15': 5, '16': 12,
  '17': 5, '18': 18, '19': 18, '20': 12, '21': 18, '22': 18, '23': 0, '24': 28,
  '25': 5, '26': 5, '27': 18, '28': 18, '29': 18, '30': 12, '31': 5, '32': 18,
  '33': 18, '34': 18, '35': 18, '36': 18, '37': 18, '38': 18, '39': 18, '40': 18,
  '41': 5, '42': 18, '43': 18, '44': 18, '45': 12, '46': 5, '47': 12, '48': 12,
  '49': 0, '50': 5, '51': 5, '52': 5, '53': 5, '54': 5, '55': 5, '56': 12,
  '57': 12, '58': 5, '59': 12, '60': 5, '61': 12, '62': 12, '63': 12, '64': 12,
  '65': 12, '66': 12, '67': 12, '68': 18, '69': 18, '70': 18, '71': 3, '72': 18,
  '73': 18, '74': 18, '75': 18, '76': 18, '78': 18, '79': 18, '80': 18, '81': 18,
  '82': 18, '83': 18, '84': 18, '85': 18, '86': 18, '87': 28, '88': 5, '89': 5,
  '90': 18, '91': 18, '92': 18, '93': 18, '94': 18, '95': 18, '96': 18, '97': 12
}

// Complete HSN codes from GST Portal (21,789 codes)
// This is loaded from the official GST portal data
import hsnDataFull from '../hsn-codes-full.json'

// Type the imported data
const HSN_CODES_FULL: HSNCode[] = hsnDataFull as HSNCode[]

// Export the full HSN codes array
export const HSN_CODES: HSNCode[] = HSN_CODES_FULL

// Helper function to get category from chapter code
export function getChapterCategory(code: string): string {
  const chapter = code.substring(0, 2)
  return CHAPTER_CATEGORIES[chapter] || 'Other'
}

// Helper function to get default GST rate from chapter code
export function getChapterGstRate(code: string): number {
  const chapter = code.substring(0, 2)
  return CHAPTER_GST_RATES[chapter] ?? 18
}

// Search HSN codes by query (code or description) with indexed approach
export function searchHSNCodes(query: string, limit: number = 50): HSNCode[] {
  const searchTerm = query.toLowerCase().trim()

  if (!searchTerm) {
    return HSN_CODES.filter(h => h.code.length <= 4).slice(0, limit)
  }

  if (searchTerm.length < 2) {
    return HSN_CODES.filter(h => h.code.startsWith(searchTerm)).slice(0, limit)
  }

  const isNumeric = /^\d+$/.test(searchTerm)
  const results: HSNCode[] = []
  const seen = new Set<string>()

  const add = (h: HSNCode) => {
    if (!seen.has(h.code)) {
      seen.add(h.code)
      results.push(h)
    }
  }

  if (isNumeric) {
    for (const h of HSN_CODES) {
      if (h.code === searchTerm) add(h)
      if (results.length >= limit) return results
    }
    for (const h of HSN_CODES) {
      if (h.code.startsWith(searchTerm)) add(h)
      if (results.length >= limit) return results
    }
    for (const h of HSN_CODES) {
      if (h.code.includes(searchTerm)) add(h)
      if (results.length >= limit) return results
    }
  } else {
    const words = searchTerm.split(/\s+/).filter(w => w.length >= 2)
    if (words.length === 0) return results

    const scored: Array<{ hsn: HSNCode; score: number }> = []

    for (const h of HSN_CODES) {
      const desc = h.description.toLowerCase()
      const cat = (h.category || "").toLowerCase()
      const allMatch = words.every(w => desc.includes(w) || cat.includes(w))
      if (!allMatch) continue

      let score = 0
      if (desc.startsWith(words[0])) score += 100
      if (desc === searchTerm) score += 200
      for (const w of words) {
        const idx = desc.indexOf(w)
        if (idx === 0) score += 50
        else if (idx > 0) score += 20
        if (cat.includes(w)) score += 10
      }
      score += Math.max(0, 20 - h.code.length)
      scored.push({ hsn: h, score })
    }

    scored.sort((a, b) => b.score - a.score)
    for (const s of scored) {
      add(s.hsn)
      if (results.length >= limit) break
    }
  }

  return results
}

// Get all unique categories
export function getHSNCategories(): string[] {
  return Object.values(CHAPTER_CATEGORIES).sort()
}

// Get HSN codes by category
export function getHSNCodesByCategory(category: string): HSNCode[] {
  return HSN_CODES.filter(hsn => hsn.category === category)
}

// Get a specific HSN code
export function getHSNCode(code: string): HSNCode | undefined {
  return HSN_CODES.find(hsn => hsn.code === code)
}

// Get HSN codes by chapter (2-digit code)
export function getHSNCodesByChapter(chapter: string): HSNCode[] {
  return HSN_CODES.filter(hsn => hsn.code.startsWith(chapter))
}

// Get all chapter codes with their categories
export function getAllChapters(): { code: string; category: string; gstRate: number }[] {
  return Object.entries(CHAPTER_CATEGORIES).map(([code, category]) => ({
    code,
    category,
    gstRate: CHAPTER_GST_RATES[code] ?? 18
  }))
}

// Search with smart matching (handles partial codes and descriptions)
export function smartSearchHSN(query: string, limit: number = 30): HSNCode[] {
  return searchHSNCodes(query, limit)
}
