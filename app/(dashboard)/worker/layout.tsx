import { DashboardLayout } from "@/components/layout";
import { workerNavGroups } from "@/components/layout/sidebar-nav";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout
      sidebarGroups={workerNavGroups}
      headerProps={{ showBreadcrumbs: true }}
    >
      {children}
    </DashboardLayout>
  );
}
