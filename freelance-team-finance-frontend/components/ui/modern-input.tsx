import * as React from "react"
import { cn } from "@/lib/utils"

export interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  rightElement?: React.ReactNode
}

const ModernInput = React.forwardRef<HTMLInputElement, ModernInputProps>(
  ({ className, type, label, error, icon, rightElement, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false)
    const hasValue = props.value !== "" && props.value !== undefined

    return (
      <div className="space-y-1">
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200",
              "placeholder:text-gray-400",
              "focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
              icon && "pl-11",
              rightElement && "pr-11",
              error && "border-red-300 focus:border-red-500 focus:ring-red-500/20",
              className
            )}
            ref={ref}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />
          {label && (
            <label
              className={cn(
                "absolute left-4 transition-all duration-200 pointer-events-none bg-white px-1",
                "text-gray-500",
                focused || hasValue
                  ? "-top-2.5 text-xs font-medium"
                  : "top-1/2 -translate-y-1/2 text-sm",
                focused && "text-blue-600",
                error && "text-red-500",
                icon && !focused && !hasValue && "left-11"
              )}
            >
              {label}
            </label>
          )}
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-1 animate-slide-up">{error}</p>
        )}
      </div>
    )
  }
)
ModernInput.displayName = "ModernInput"

export { ModernInput }