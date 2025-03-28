
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-crypto-blue text-white hover:bg-crypto-darkblue",
        outline: "border border-crypto-gray text-crypto-text hover:bg-crypto-gray/20",
        ghost: "hover:bg-crypto-gray/20 text-crypto-text",
        link: "text-crypto-blue underline-offset-4 hover:underline",
        destructive: "bg-crypto-red text-white hover:bg-crypto-red/90",
        success: "bg-crypto-green text-white hover:bg-crypto-green/90",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
        pill: "h-9 px-4 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface CryptoButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const CryptoButton = React.forwardRef<HTMLButtonElement, CryptoButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
CryptoButton.displayName = "CryptoButton"

export { CryptoButton, buttonVariants }
