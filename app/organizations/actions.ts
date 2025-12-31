"use server"

import { getCurrentUser } from "@/lib/auth"
import { createOrganization } from "@/lib/organizations"

export async function createOrganizationAction(data: {
  name: string
  email: string
  phone?: string
  address?: string
  gstNumber?: string
  panNumber?: string
  city?: string
  state?: string
  pincode?: string
  legalName?: string
  tradeName?: string
}) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const result = await createOrganization(user.id, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      gstNumber: data.gstNumber,
      panNumber: data.panNumber,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      legalName: data.legalName,
      tradeName: data.tradeName,
    })

    return result
  } catch (error) {
    console.error("[v0] Error in createOrganizationAction:", error)
    return { success: false, error: "An error occurred" }
  }
}
