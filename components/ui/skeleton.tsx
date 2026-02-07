import { cn } from "@/lib/utils"

/**
 * Skeleton component for loading states
 * Uses Tailwind's animate-pulse for smooth loading animations
 */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

/**
 * Skeleton for card-like components
 */
function SkeletonCard() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-[125px] w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  )
}

/**
 * Skeleton for text content
 */
function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4 w-full",
            i === lines - 1 && "w-3/4"
          )} 
        />
      ))}
    </div>
  )
}

/**
 * Skeleton for form inputs
 */
function SkeletonInput() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

/**
 * Skeleton for avatar/circular elements
 */
function SkeletonAvatar({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    default: "h-12 w-12",
    lg: "h-16 w-16",
  }
  
  return (
    <Skeleton className={cn("rounded-full", sizeClasses[size])} />
  )
}

/**
 * Skeleton for table rows
 */
function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center space-x-4 rounded-md border p-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  )
}

/**
 * Skeleton for button elements
 */
function SkeletonButton() {
  return (
    <Skeleton className="h-10 w-32 rounded-md" />
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonText,
  SkeletonInput,
  SkeletonAvatar,
  SkeletonTableRow,
  SkeletonButton,
}
