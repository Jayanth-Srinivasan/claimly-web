"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-black group-[.toaster]:border-black/10 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-black dark:group-[.toaster]:text-white dark:group-[.toaster]:border-white/10",
          description: "group-[.toast]:text-black/60 dark:group-[.toast]:text-white/60",
          actionButton:
            "group-[.toast]:bg-black group-[.toast]:text-white dark:group-[.toast]:bg-white dark:group-[.toast]:text-black",
          cancelButton:
            "group-[.toast]:bg-black/10 group-[.toast]:text-black dark:group-[.toast]:bg-white/10 dark:group-[.toast]:text-white",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
