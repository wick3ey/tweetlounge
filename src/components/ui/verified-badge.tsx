
import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface VerifiedBadgeProps extends React.HTMLAttributes<HTMLDivElement> {}

function VerifiedBadge({ className, ...props }: VerifiedBadgeProps) {
  return (
    <div 
      className={cn(
        "inline-flex items-center justify-center p-0 bg-crypto-blue rounded-full w-4 h-4 flex-shrink-0 ml-1", 
        className
      )} 
      {...props}
    >
      <Check className="h-2.5 w-2.5 text-white stroke-[3]" />
    </div>
  )
}

export { VerifiedBadge }
