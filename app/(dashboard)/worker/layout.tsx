import { DashboardLayout } from "@/components/layout"
import { workerNavItems } from "@/components/layout/sidebar-nav"

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout
      sidebarItems={workerNavItems}
      headerProps={{ showBreadcrumbs: true }}
    >
      {children}
    </DashboardLayout>
  )
}
