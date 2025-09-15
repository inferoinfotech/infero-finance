"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { LayoutDashboard, FolderOpen, Receipt, Wallet, Settings, History, Bell, FileText, LogOut } from "lucide-react"
import type { Role } from "@/contexts/auth-context"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: FileText },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Accounts", href: "/accounts", icon: Wallet },
  { name: "Platforms", href: "/platforms", icon: Settings },
  { name: "History", href: "/history", icon: History },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Reports", href: "/reports", icon: FileText },
]

function itemsForRole(role?: Role) {
  if (!role) return []
  if (role === "sales") return navigation.filter((n) => n.name === "Leads")
  if (role === "developer") return navigation.filter((n) => n.name === "Reports")
  // admin & owner get everything
  if (role === "admin" || role === "owner") return navigation
  return []
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const items = itemsForRole(user?.role)

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white min-h-screen">
      <div className="flex items-center justify-center h-16">
        <img src="/infero.png" alt="FreelanceTeam Logo" className="h-14" />
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
        {items.length === 0 && (
          <div className="text-xs text-gray-400 px-4 py-2">No menu items for your role.</div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">{user?.name?.charAt(0)}</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  )
}
