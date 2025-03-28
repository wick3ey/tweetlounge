
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-crypto-blue text-white hover:bg-crypto-darkblue shadow-sm hover:shadow-md active:translate-y-[1px]",
        outline: "border border-crypto-gray text-crypto-text hover:bg-crypto-gray/20 active:translate-y-[1px]",
        ghost: "hover:bg-crypto-gray/20 text-crypto-text",
        link: "text-crypto-blue underline-offset-4 hover:underline",
        destructive: "bg-crypto-red text-white hover:bg-crypto-red/90 shadow-sm",
        success: "bg-crypto-green text-white hover:bg-crypto-green/90 shadow-sm",
        secondary: "bg-crypto-gray/70 text-white hover:bg-crypto-gray/90 shadow-sm",
        gradient: "bg-gradient-to-r from-crypto-blue to-blue-500 text-white hover:brightness-110 shadow-sm hover:shadow-md",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md text-xs",
        lg: "h-11 px-8 rounded-md text-base",
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
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const CryptoButton = React.forwardRef<HTMLButtonElement, CryptoButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {children}
      </button>
    )
  }
)
CryptoButton.displayName = "CryptoButton"

export { CryptoButton, buttonVariants }
