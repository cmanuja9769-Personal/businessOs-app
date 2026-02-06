import { getSettings, getOrganizationDetails } from "./actions"
import { PageHeader } from "@/components/ui/page-header"
import { SettingsTabsClient } from "../../components/settings/settings-tabs-client"

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [settings, organization] = await Promise.all([
    getSettings(),
    getOrganizationDetails()
  ])

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your business settings and preferences"
      />

      <SettingsTabsClient settings={settings} organization={organization} />
    </div>
  )
}
