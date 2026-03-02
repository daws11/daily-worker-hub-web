import * as React from "react"

export function Separator({ children }: { children?: string }) {
  return (
    <div className="relative flex items-center py-4">
      <div className="flex-1 border-t border-slate-200" />
      {children && (
        <span className="flex-shrink-0 px-4 text-sm text-slate-500 font-medium">
          {children}
        </span>
      )}
      <div className="flex-1 border-t border-slate-200" />
    </div>
  )
}
