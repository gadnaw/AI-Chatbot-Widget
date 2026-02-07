import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

/**
 * Alert component for displaying error states, warnings, and information
 * Follows Shadcn/ui patterns with variants for different message types
 */
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning"
  title?: string
  description?: string
  dismissible?: boolean
  onDismiss?: () => void
}

const alertVariants = {
  default: {
    container: "bg-blue-50 text-blue-900 border-blue-200",
    icon: "text-blue-500",
    iconComponent: Info,
  },
  destructive: {
    container: "bg-red-50 text-red-900 border-red-200",
    icon: "text-red-500",
    iconComponent: AlertCircle,
  },
  success: {
    container: "bg-green-50 text-green-900 border-green-200",
    icon: "text-green-500",
    iconComponent: CheckCircle,
  },
  warning: {
    container: "bg-yellow-50 text-yellow-900 border-yellow-200",
    icon: "text-yellow-500",
    iconComponent: AlertTriangle,
  },
}

function Alert({ 
  className, 
  variant = "default", 
  title, 
  description, 
  dismissible = false,
  onDismiss,
  children,
  ...props 
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true)
  
  if (!isVisible) return null

  const variantStyles = alertVariants[variant]
  const Icon = variantStyles.iconComponent

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-lg border p-4",
        variantStyles.container,
        className
      )}
      role="alert"
      {...props}
    >
      <div className={cn("flex-shrink-0 mt-0.5", variantStyles.icon)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      
      <div className="flex-1 min-w-0">
        {title && (
          <h5 className="font-medium leading-none tracking-tight mb-1">
            {title}
          </h5>
        )}
        {description && (
          <div className={cn("text-sm", !title && "leading-none")}>
            {description}
          </div>
        )}
        {children && (
          <div className="mt-2 text-sm">
            {children}
          </div>
        )}
      </div>

      {dismissible && (
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className={cn(
              "h-8 w-8 p-0 hover:bg-transparent",
              "text-inherit hover:text-inherit opacity-50 hover:opacity-100"
            )}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * AlertTitle component for use with Alert
 */
function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5 
      className={cn("font-medium leading-none tracking-tight", className)} 
      {...props} 
    />
  )
}

/**
 * AlertDescription component for use with Alert
 */
function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("text-sm [&_p]:leading-relaxed", className)} 
      {...props} 
    />
  )
}

/**
 * Convenience components for common alert types
 */
function AlertError({ title, description, ...props }: Omit<AlertProps, "variant">) {
  return (
    <Alert variant="destructive" title={title} description={description} {...props} />
  )
}

function AlertSuccess({ title, description, ...props }: Omit<AlertProps, "variant">) {
  return (
    <Alert variant="success" title={title} description={description} {...props} />
  )
}

function AlertWarning({ title, description, ...props }: Omit<AlertProps, "variant">) {
  return (
    <Alert variant="warning" title={title} description={description} {...props} />
  )
}

function AlertInfo({ title, description, ...props }: Omit<AlertProps, "variant">) {
  return (
    <Alert variant="default" title={title} description={description} {...props} />
  )
}

export {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertError,
  AlertSuccess,
  AlertWarning,
  AlertInfo,
}
