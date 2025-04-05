
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'blue' | 'gold';
}

export function VerifiedBadge({ 
  className, 
  size = 'md',
  variant = 'blue'
}: VerifiedBadgeProps) {
  const sizeClass = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  }[size];

  const colorClass = {
    blue: "text-blue-500",
    gold: "text-amber-400"
  }[variant];

  return (
    <span className={cn("inline-flex", className)}>
      <BadgeCheck className={cn(sizeClass, colorClass)} />
    </span>
  );
}
