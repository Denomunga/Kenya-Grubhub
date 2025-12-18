import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden group magnetic",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-0 shadow-lg hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-1 active:translate-y-0 active:shadow-md before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 luminous-glow",
        destructive:
          "bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground border-0 shadow-lg hover:shadow-xl hover:shadow-destructive/25 hover:-translate-y-1 active:translate-y-0 active:shadow-md before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 luminous-glow",
        outline:
          "border-2 border-gradient bg-background/50 backdrop-blur-sm shadow-md hover:bg-accent hover:text-accent-foreground hover:shadow-lg hover:-translate-y-1 active:translate-y-0 active:shadow-md hover:border-primary/50 transition-all duration-300 border-animated-gradient",
        secondary:
          "bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground border-0 shadow-lg hover:shadow-xl hover:shadow-secondary/25 hover:-translate-y-1 active:translate-y-0 active:shadow-md before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 luminous-glow",
        ghost:
          "hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 hover:text-primary hover:shadow-md active:bg-accent/50 rounded-lg transition-all duration-300 magnetic",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 transition-all duration-300 hover:underline-thick hover-letter-spacing",
      },
      size: {
        default: "min-h-10 px-4 py-2 text-sm font-medium rounded-lg",
        sm: "min-h-9 px-3.5 text-xs rounded-md",
        lg: "min-h-11 px-8 text-base font-semibold rounded-lg",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
