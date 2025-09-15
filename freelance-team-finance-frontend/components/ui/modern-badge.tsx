import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-blue-100 text-blue-800 hover:bg-blue-200",
        secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
        success: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
        warning: "bg-amber-100 text-amber-800 hover:bg-amber-200",
        danger: "bg-red-100 text-red-800 hover:bg-red-200",
        info: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
        purple: "bg-purple-100 text-purple-800 hover:bg-purple-200",
        pink: "bg-pink-100 text-pink-800 hover:bg-pink-200",
        outline: "text-foreground border border-gray-300 hover:bg-gray-50",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function ModernBadge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <div className="w-2 h-2 rounded-full bg-current opacity-60" />}
      {children}
    </div>
  )
}

export { ModernBadge, badgeVariants }