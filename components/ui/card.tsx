import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-black",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

export { Card }
