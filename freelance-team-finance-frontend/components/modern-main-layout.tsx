"use client"

import type React from "react"
import { ModernSidebar } from "./modern-sidebar"
import { ProtectedRoute } from "./protected-route"

interface ModernMainLayoutProps {
  children: React.ReactNode
}

export function ModernMainLayout({ children }: ModernMainLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ModernSidebar />
        <main className="flex-1 ml-0 lg:ml-0">
          <div className="lg:p-8 p-4 pt-16 lg:pt-8 min-h-screen">
            <div className="animate-fade-in">
              {children}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}