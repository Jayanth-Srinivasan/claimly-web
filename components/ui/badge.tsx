import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-black dark:bg-white text-white dark:text-black hover:bg-black/80 dark:hover:bg-white/80",
        secondary:
          "border-transparent bg-black/10 dark:bg-white/10 text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20",
        outline: "text-black dark:text-white border-black/10 dark:border-white/10",
        active:
          "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
        inactive:
          "bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60 border-black/20 dark:border-white/20",
        required:
          "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
