"use client"

import { Component, ReactNode } from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Link from "next/link"

/**
 * Error boundary component for graceful error handling
 * Catches React component errors and displays a fallback UI
 */
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorFallbackProps {
  error: Error
  reset: () => void
}

/**
 * Default error fallback component
 */
function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === "development"

  return (
    <div className="container mx-auto py-10 px-4">
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Something went wrong!</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="font-medium mb-2">
            We encountered an unexpected error while rendering this page.
          </p>
          
          {isDevelopment && (
            <div className="mt-3 p-3 bg-red-100 rounded text-sm font-mono overflow-auto">
              <p className="font-semibold text-red-800 mb-1">Error:</p>
              <p className="text-red-700">{error.message}</p>
              {error.stack && (
                <>
                  <p className="font-semibold text-red-800 mt-2 mb-1">Stack Trace:</p>
                  <pre className="text-xs whitespace-pre-wrap text-red-600">
                    {error.stack.split("\n").slice(0, 10).join("\n")}
                  </pre>
                </>
              )}
            </div>
          )}
          
          {!isDevelopment && (
            <p className="text-sm text-muted-foreground mt-2">
              If this problem persists, please contact support.
            </p>
          )}
        </AlertDescription>
        
        <div className="mt-4 flex gap-2">
          <Button onClick={reset} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </Alert>
    </div>
  )
}

/**
 * Simple loading fallback component
 */
function LoadingFallback() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-32 bg-muted rounded" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
    </div>
  )
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo)
    }
    
    // In production, you might want to send this to an error reporting service
    // errorReportingService.captureException(error, { extra: errorInfo })
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error!, this.reset)
      }
      
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      return <ErrorFallback error={this.state.error!} reset={this.reset} />
    }

    return this.props.children
  }
}

/**
 * Higher-order component that wraps a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

/**
 * Hook for programmatic error handling within a boundary
 */
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null)

  const resetError = () => {
    setError(null)
  }

  const throwError = (err: Error) => {
    setError(err)
    throw err // Re-throw to trigger error boundary
  }

  return { error, throwError, resetError }
}

export { ErrorFallback, LoadingFallback }
