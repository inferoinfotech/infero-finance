import * as React from "react"
import { cn } from "@/lib/utils"

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card"
  width?: string | number
  height?: string | number
  lines?: number
}

export function LoadingSkeleton({ 
  className, 
  variant = "rectangular", 
  width, 
  height, 
  lines = 1,
  ...props 
}: LoadingSkeletonProps) {
  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-4 bg-gray-200 rounded animate-pulse",
              index === lines - 1 ? "w-3/4" : "w-full",
              className
            )}
            style={{ width: index === lines - 1 ? "75%" : width }}
          />
        ))}
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div className={cn("p-6 space-y-4 bg-white rounded-2xl border border-gray-100", className)} {...props}>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "bg-gray-200 animate-pulse",
        {
          "rounded": variant === "rectangular",
          "rounded-full": variant === "circular",
          "h-4 rounded": variant === "text",
        },
        className
      )}
      style={{ width, height }}
      {...props}
    />
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex space-x-4 p-4 border-b">
        {Array.from({ length: columns }).map((_, index) => (
          <LoadingSkeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}