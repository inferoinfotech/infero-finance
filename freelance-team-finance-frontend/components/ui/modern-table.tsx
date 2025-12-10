import * as React from "react"
import { cn } from "@/lib/utils"

const ModernTable = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto rounded-2xl border border-gray-100 bg-white shadow-sm max-h-[70vh]">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  )
)
ModernTable.displayName = "ModernTable"

const ModernTableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead 
      ref={ref} 
      className={cn("bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10", className)} 
      {...props} 
    />
  )
)
ModernTableHeader.displayName = "ModernTableHeader"

const ModernTableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  )
)
ModernTableBody.displayName = "ModernTableBody"

const ModernTableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn("bg-gray-50 border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  )
)
ModernTableFooter.displayName = "ModernTableFooter"

const ModernTableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-gray-100 transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
)
ModernTableRow.displayName = "ModernTableRow"

const ModernTableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-14 px-6 text-left align-middle font-semibold text-gray-700 [&:has([role=checkbox])]:pr-0 text-xs uppercase tracking-wider",
        className
      )}
      {...props}
    />
  )
)
ModernTableHead.displayName = "ModernTableHead"

const ModernTableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("p-6 align-middle [&:has([role=checkbox])]:pr-0 text-gray-900", className)}
      {...props}
    />
  )
)
ModernTableCell.displayName = "ModernTableCell"

const ModernTableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  )
)
ModernTableCaption.displayName = "ModernTableCaption"

export {
  ModernTable,
  ModernTableHeader,
  ModernTableBody,
  ModernTableFooter,
  ModernTableHead,
  ModernTableRow,
  ModernTableCell,
  ModernTableCaption,
}