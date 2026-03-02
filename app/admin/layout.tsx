import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AdminNav } from '@/components/admin/admin-nav'
import { AdminHeader } from '@/components/admin/admin-header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Admin Dashboard - Daily Worker Hub',
  description: 'Platform administration and management',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={inter.className}>
      <div className="flex min-h-screen">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r bg-background p-4">
          <AdminNav />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
