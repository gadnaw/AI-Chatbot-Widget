'use client'

import { useState, useCallback } from 'react'
import { Eye, EyeOff, Copy, RefreshCw, AlertTriangle, Check } from 'lucide-react'
import { ApiKey } from '@/types/api-keys'
import { regenerateKey } from '@/lib/api-keys'
import { useToast } from '@/components/ui/use-toast'

interface ApiKeyManagerProps {
  apiKey: ApiKey
  onKeyRegenerated: (newApiKey: ApiKey, newPlaintextKey: string) => void
}

export function ApiKeyManager({ apiKey, onKeyRegenerated }: ApiKeyManagerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showPlaintextKey, setShowPlaintextKey] = useState(false)
  const [newPlaintextKey, setNewPlaintextKey] = useState<string | null>(null)
  const { toast } = useToast()

  const handleCopyPrefix = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(apiKey.prefix)
      toast({
        title: 'Copied',
        description: 'API key prefix copied to clipboard',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    }
  }, [apiKey.prefix, toast])

  const handleRegenerate = async () => {
    if (!confirm('Are you sure you want to regenerate your API key? This will immediately invalidate the current key and any websites using it will stop working until you update the embed code.')) {
      return
    }

    setIsRegenerating(true)
    try {
      const result = await regenerateKey(apiKey.tenant_id)
      setNewPlaintextKey(result.newPlaintextKey)
      setShowPlaintextKey(true)
      onKeyRegenerated(result.apiKey, result.newPlaintextKey)
      toast({
        title: 'Key Regenerated',
        description: 'Your new API key has been generated. Copy it now!',
        variant: 'default',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to regenerate API key. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleCopyNewKey = useCallback(async () => {
    if (!newPlaintextKey) return
    try {
      await navigator.clipboard.writeText(newPlaintextKey)
      toast({
        title: 'Copied',
        description: 'New API key copied to clipboard',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    }
  }, [newPlaintextKey, toast])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* API Key Display Section */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">API Key</h2>
        
        <div className="space-y-4">
          {/* Current Key Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current API Key
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <code className="block w-full px-4 py-3 bg-gray-50 rounded-md font-mono text-sm break-all border">
                  {isVisible ? apiKey.prefix : '••••••••••••••••'}
                </code>
              </div>
              <button
                onClick={() => setIsVisible(!isVisible)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title={isVisible ? 'Hide key' : 'Show key'}
              >
                {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <button
                onClick={handleCopyPrefix}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy key"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Only showing prefix for security. Full key is only shown during creation.
            </p>
          </div>

          {/* Key Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created: </span>
              <span className="font-medium">{formatDate(apiKey.created_at)}</span>
            </div>
            <div>
              <span className="text-gray-500">Last Used: </span>
              <span className="font-medium">{formatDate(apiKey.last_used_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Regenerate Key Section */}
      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-800 mb-2">Regenerate API Key</h3>
            <p className="text-sm text-yellow-700 mb-4">
              Regenerating your API key will immediately invalidate the current key. 
              Any websites using the old key will stop working until you update the embed code with the new key.
            </p>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRegenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate API Key
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* New Key Display (after regeneration) */}
      {showPlaintextKey && newPlaintextKey && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
          <div className="flex items-start space-x-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 mb-2">New API Key Generated</h3>
              <p className="text-sm text-green-700 mb-4">
                Your new API key has been generated. Copy it now and update your websites!
              </p>
              
              <div className="bg-white rounded border p-4 mb-4">
                <code className="block font-mono text-sm break-all">
                  {newPlaintextKey}
                </code>
              </div>
              
              <button
                onClick={handleCopyNewKey}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy New Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
