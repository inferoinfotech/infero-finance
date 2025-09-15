import * as React from "react"
import { ModernCard, ModernCardContent } from "./modern-card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: "default" | "gradient" | "minimal"
  className?: string
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  variant = "default",
  className 
}: StatCardProps) {
  return (
    <ModernCard 
      variant={variant === "gradient" ? "gradient" : variant === "minimal" ? "glass" : "default"}
      className={cn("group", className)}
    >
      <ModernCardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className={cn(
              "text-sm font-medium",
              variant === "gradient" ? "text-white/80" : "text-gray-600"
            )}>
              {title}
            </p>
            <p className={cn(
              "text-2xl font-bold tracking-tight",
              variant === "gradient" ? "text-white" : "text-gray-900"
            )}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className={cn(
                "text-xs",
                variant === "gradient" ? "text-white/70" : "text-gray-500"
              )}>
                {subtitle}
              </p>
            )}
          </div>
          {icon && (
            <div className={cn(
              "rounded-lg p-2 transition-transform duration-200 group-hover:scale-110",
              variant === "gradient" 
                ? "bg-white/20 text-white" 
                : "bg-gray-100 text-gray-600"
            )}>
              {icon}
            </div>
          )}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3">
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              trend.isPositive 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-red-100 text-red-700"
            )}>
              <span className={cn(
                "text-xs",
                trend.isPositive ? "text-emerald-600" : "text-red-600"
              )}>
                {trend.isPositive ? "↗" : "↘"}
              </span>
              {Math.abs(trend.value)}%
            </div>
            <span className={cn(
              "text-xs",
              variant === "gradient" ? "text-white/70" : "text-gray-500"
            )}>
              vs last month
            </span>
          </div>
        )}
      </ModernCardContent>
    </ModernCard>
  )
}