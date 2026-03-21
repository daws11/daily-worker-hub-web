import { DashboardLayout } from "@/components/layout";
import { businessNavGroups } from "@/components/layout/sidebar-nav";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout sidebarGroups={businessNavGroups} role="business">
      {children}
    </DashboardLayout>
  );
}
