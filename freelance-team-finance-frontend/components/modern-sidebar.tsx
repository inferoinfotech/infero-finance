"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { 
  LayoutDashboard, 
  FolderOpen, 
  Receipt, 
  Wallet, 
  Settings, 
  History, 
  Bell, 
  FileText, 
  LogOut,
  User,
  ChevronDown,
  Menu,
  X
} from "lucide-react"
import { ModernBadge } from "./ui/modern-badge"
import { ModernButton } from "./ui/modern-button"
import type { Role } from "@/contexts/auth-context"
import { useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-600" },
  { name: "Leads", href: "/leads", icon: FileText, color: "text-green-600" },
  { name: "Projects", href: "/projects", icon: FolderOpen, color: "text-purple-600" },
  { name: "Expenses", href: "/expenses", icon: Receipt, color: "text-orange-600" },
  { name: "Accounts", href: "/accounts", icon: Wallet, color: "text-teal-600" },
  { name: "Platforms", href: "/platforms", icon: Settings, color: "text-indigo-600" },
  { name: "History", href: "/history", icon: History, color: "text-gray-600" },
  { name: "Notifications", href: "/notifications", icon: Bell, color: "text-red-600" },
  { name: "Reports", href: "/reports", icon: FileText, color: "text-yellow-600" },
]

function itemsForRole(role?: Role) {
  if (!role) return []
  if (role === "sales") return navigation.filter((n) => n.name === "Leads")
  if (role === "developer") return navigation.filter((n) => n.name === "Reports")
  // admin & owner get everything
  if (role === "admin" || role === "owner") return navigation
  return []
}

export function ModernSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const items = itemsForRole(user?.role)

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">I</span>
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-white font-bold text-lg">Infero</h2>
              <p className="text-white/70 text-xs">Infotech Solutions</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`
                group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="font-medium">{item.name}</span>
                  {item.name === "Notifications" && (
                    <ModernBadge variant="danger" size="sm" className="ml-auto">
                      3
                    </ModernBadge>
                  )}
                </>
              )}
            </Link>
          )
        })}
        {items.length === 0 && (
          <div className="text-white/60 text-sm px-4 py-2 text-center">
            No menu items available
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{user?.name}</p>
              <p className="text-white/70 text-xs truncate">{user?.email}</p>
              <ModernBadge variant="success" size="sm" className="mt-1">
                {user?.role}
              </ModernBadge>
            </div>
          )}
        </div>
        <ModernButton
          variant="ghost"
          className="w-full mt-3 text-white/80 hover:text-white hover:bg-white/10"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && "Logout"}
        </ModernButton>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white shadow-lg border border-gray-200"
      >
        <Menu className="h-6 w-6 text-gray-600" />
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <div className={`
        lg:hidden fixed top-0 left-0 z-50 h-full w-80 bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className={`
        hidden lg:flex flex-col bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900 text-white
        transition-all duration-300 ease-in-out
        sticky top-0 h-screen z-40 flex-shrink-0
        ${isCollapsed ? 'w-20' : 'w-80'}
      `}>
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? 'rotate-90' : '-rotate-90'}`} />
        </button>
        <SidebarContent />
      </div>
    </>
  )
}