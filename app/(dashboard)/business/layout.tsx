import { DashboardLayout } from "@/components/layout";
import { businessNavItems } from "@/components/layout/sidebar-nav";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout sidebarItems={businessNavItems}>
      {children}
    </DashboardLayout>
  );
}
