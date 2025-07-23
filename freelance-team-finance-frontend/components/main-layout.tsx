"use client"

import type React from "react"

import { Sidebar } from "./sidebar"
import { ProtectedRoute } from "./protected-route"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
