import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ModernSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

const ModernSelect = React.forwardRef<HTMLSelectElement, ModernSelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false)
    const hasValue = props.value !== "" && props.value !== undefined

    return (
      <div className="space-y-1">
        <div className="relative">
          <select
            className={cn(
              "flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200",
              "focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
              "appearance-none cursor-pointer",
              error && "border-red-300 focus:border-red-500 focus:ring-red-500/20",
              className
            )}
            ref={ref}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          >
            <option value="" disabled hidden></option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {label && (
            <label
              className={cn(
                "absolute left-4 transition-all duration-200 pointer-events-none bg-white px-1",
                "text-gray-500",
                focused || hasValue
                  ? "-top-2.5 text-xs font-medium"
                  : "top-1/2 -translate-y-1/2 text-sm",
                focused && "text-blue-600",
                error && "text-red-500"
              )}
            >
              {label}
            </label>
          )}
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-1 animate-slide-up">{error}</p>
        )}
      </div>
    )
  }
)
ModernSelect.displayName = "ModernSelect"

export { ModernSelect }