import * as React from "react"
import { cn } from "@/lib/utils"

interface ModernCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "gradient" | "glass" | "elevated"
  hover?: boolean
}

const ModernCard = React.forwardRef<HTMLDivElement, ModernCardProps>(
  ({ className, variant = "default", hover = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl transition-all duration-300",
          {
            "bg-white border border-gray-100 shadow-sm": variant === "default",
            "gradient-primary text-white": variant === "gradient",
            "glass text-gray-900": variant === "glass",
            "bg-white shadow-lg border-0": variant === "elevated",
          },
          {
            "card-hover cursor-pointer": hover,
          },
          className
        )}
        {...props}
      >
        {variant === "gradient" && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        )}
        <div className="relative z-10">{children}</div>
      </div>
    )
  }
)
ModernCard.displayName = "ModernCard"

const ModernCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pb-3", className)} {...props} />
  )
)
ModernCardHeader.displayName = "ModernCardHeader"

const ModernCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 pb-6", className)} {...props} />
  )
)
ModernCardContent.displayName = "ModernCardContent"

const ModernCardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-xl font-bold leading-tight", className)} {...props}>
      {children}
    </h3>
  )
)
ModernCardTitle.displayName = "ModernCardTitle"

const ModernCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-gray-600 mt-1", className)} {...props} />
  )
)
ModernCardDescription.displayName = "ModernCardDescription"

export { ModernCard, ModernCardHeader, ModernCardContent, ModernCardTitle, ModernCardDescription }