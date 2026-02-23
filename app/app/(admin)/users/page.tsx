"use client"

import { UserTable } from "@/components/admin/user-table"

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          User Management
        </h1>
        <p className="text-muted-foreground mt-2">
          View and manage all platform users including workers, businesses, and admins
        </p>
      </div>

      <UserTable />
    </div>
  )
}
