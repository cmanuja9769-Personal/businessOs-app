/**
 * GST Lookup Utility
 * 
 * This module provides functionality to fetch GST details from various sources.
 * 
 * Options for GST lookup:
 * 1. Third-party APIs (Recommended for production):
 *    - GST API by Razorpay
 *    - GST Verification API by various providers
 *    - KnowYourGST API
 * 
 * 2. Free alternatives:
 *    - GST Public Search Portal (requires web scraping - not recommended)
 *    - Master GST API
 * 

 * For this implementation, we'll create a structure that can work with any API provider.
 * You'll need to sign up for a GST API service and add your API key to environment variables.
 */

interface GSTAddressObject {
  bno?: string
  building_number?: string
  bnm?: string
  building_name?: string
  flno?: string
  floor_number?: string
  st?: string
  street?: string
  loc?: string
  locality?: string
  dst?: string
  district?: string
  stcd?: string
  state?: string
  pncd?: string
  pincode?: string
}

export interface GSTDetails {
  gstin: string
  legalName: string
  tradeName?: string
  address: string
  state: string
  stateCode: string
  pincode?: string
  businessType?: string
  registrationDate?: string
  status?: string
}

/**
 * Validates GST number format
 */
export function isValidGSTIN(gstin: string): boolean {
  const gstinRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
  return gstinRegex.test(gstin)
}

/**
 * Fetches GST details from the configured API
 * 
 * API Options to configure in .env:
 * 
 * Option 1: Using GST API Service (Recommended)
 * - Sign up at: https://www.mastergst.com/ or similar service
 * - Add to .env: GST_API_KEY=your_api_key
 * - Add to .env: GST_API_URL=https://api.mastergst.com/
 * 
 * Option 2: Using Government Portal (Free but requires scraping)
 * - Not recommended due to reliability issues
 * 
 * @param gstin - The GST number to lookup
 * @returns Promise with GST details or null if not found
 */
export async function fetchGSTDetails(gstin: string): Promise<GSTDetails | null> {
  // Validate GSTIN format first
  if (!isValidGSTIN(gstin)) {
    throw new Error("Invalid GSTIN format")
  }

  const apiKey = process.env.GST_API_KEY
  const apiUrl = process.env.GST_API_URL

  // If no API configured, return mock data for development
  if (!apiKey || !apiUrl) {
    console.warn("GST API not configured. Add GST_API_KEY and GST_API_URL to .env file")
    
    // Return mock data for development/testing
    if (process.env.NODE_ENV === "development") {
      return getMockGSTDetails(gstin)
    }
    
    throw new Error("GST API not configured. Please contact administrator.")
  }

  try {
    // Example implementation for MasterGST API
    // Adjust based on your chosen API provider
    const response = await fetch(`${apiUrl}/gstapi/v1.1/search?gstin=${gstin}`, {
      headers: {
        "username": process.env.GST_API_USERNAME || "",
        "password": apiKey,
        "ip_address": "127.0.0.1",
        "client_id": process.env.GST_API_CLIENT_ID || "",
        "client_secret": process.env.GST_API_CLIENT_SECRET || "",
        "gstin": gstin,
      },
    })

    if (!response.ok) {
      throw new Error(`GST API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Parse response based on API format
    // This structure may vary depending on your API provider
    if (data && data.data) {
      return {
        gstin: data.data.gstin || gstin,
        legalName: data.data.lgnm || data.data.legal_name || "",
        tradeName: data.data.tradeNam || data.data.trade_name,
        address: formatAddress(data.data.pradr || data.data.address),
        state: data.data.stj || data.data.state || "",
        stateCode: gstin.substring(0, 2),
        pincode: data.data.pradr?.pncd || "",
        businessType: data.data.dty || "",
        registrationDate: data.data.rgdt || "",
        status: data.data.sts || data.data.status || "",
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching GST details:", error)
    throw new Error("Failed to fetch GST details. Please try again.")
  }
}

/**
 * Formats address object to a single string
 */
function formatAddress(addressObj: string | GSTAddressObject | null | undefined): string {
  if (typeof addressObj === "string") {
    return addressObj
  }

  if (!addressObj) {
    return ""
  }

  const parts = [
    addressObj.bno || addressObj.building_number,
    addressObj.bnm || addressObj.building_name,
    addressObj.flno || addressObj.floor_number,
    addressObj.st || addressObj.street,
    addressObj.loc || addressObj.locality,
    addressObj.dst || addressObj.district,
    addressObj.stcd || addressObj.state,
    addressObj.pncd || addressObj.pincode,
  ]

  return parts.filter(Boolean).join(", ")
}

/**
 * Returns mock GST details for development/testing
 */
function getMockGSTDetails(gstin: string): GSTDetails {
  const stateCode = gstin.substring(0, 2)
  const stateNames: Record<string, string> = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "27": "Maharashtra",
    "29": "Karnataka",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "36": "Telangana",
    "37": "Andhra Pradesh",
  }

  return {
    gstin,
    legalName: "Sample Business Pvt Ltd",
    tradeName: "Sample Business",
    address: `123, Sample Street, Sample Area, Sample City, ${stateNames[stateCode] || "Unknown"} - 400001`,
    state: stateNames[stateCode] || "Unknown",
    stateCode,
    pincode: "400001",
    businessType: "Private Limited Company",
    registrationDate: "2020-01-01",
    status: "Active",
  }
}
