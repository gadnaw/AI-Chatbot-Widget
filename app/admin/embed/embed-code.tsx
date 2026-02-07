'use client'

import { useState, useCallback } from 'react'
import { Copy, Check, Code2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { WidgetSettings } from '@/types/widget-settings'

interface EmbedCodeProps {
  apiKeyPrefix: string
  widgetSettings: WidgetSettings
  widgetUrl?: string
}

export function EmbedCode({ 
  apiKeyPrefix, 
  widgetSettings,
  widgetUrl = 'https://cdn.example.com/widget' 
}: EmbedCodeProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const embedScript = generateEmbedScript({
    widgetUrl,
    apiKey: apiKeyPrefix,
    primaryColor: widgetSettings.primary_color,
    position: widgetSettings.position,
    welcomeMessage: widgetSettings.welcome_message
  })

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedScript)
      setCopied(true)
      toast({
        title: 'Copied',
        description: 'Embed code copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    }
  }, [embedScript, toast])

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Code2 className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Embed Code</h2>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1.5 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1.5" />
              Copy Code
            </>
          )}
        </button>
      </div>

      {/* Embed Code Display */}
      <div className="relative">
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto font-mono text-sm">
          <code>{embedScript}</code>
        </pre>
      </div>

      {/* Integration Instructions */}
      <div className="mt-6 space-y-4">
        <h3 className="font-medium text-gray-900">How to Install</h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div>
              <p className="text-sm text-gray-700">
                Copy the embed code above
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div>
              <p className="text-sm text-gray-700">
                Paste the code just before the closing <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag on your website
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
              3
            </div>
            <div>
              <p className="text-sm text-gray-700">
                The widget will automatically load on page visits with your configured appearance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="font-medium text-gray-900 mb-3">Widget Configuration</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Primary Color: </span>
            <span className="font-medium">
              <span className="inline-block w-3 h-3 rounded-full mr-1 align-middle" style={{ backgroundColor: widgetSettings.primary_color }}></span>
              {widgetSettings.primary_color}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Position: </span>
            <span className="font-medium capitalize">{widgetSettings.position.replace('-', ' ')}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Welcome Message: </span>
            <span className="font-medium">"{widgetSettings.welcome_message}"</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          These settings are automatically applied from your <a href="/admin/settings" className="text-blue-600 hover:underline">widget settings</a>.
        </p>
      </div>
    </div>
  )
}

/**
 * Generate embed script with configuration
 */
function generateEmbedScript(config: {
  widgetUrl: string
  apiKey: string
  primaryColor: string
  position: string
  welcomeMessage: string
}): string {
  const { widgetUrl, apiKey, primaryColor, position, welcomeMessage } = config
  
  return `<script
  src="${widgetUrl}/widget.js"
  data-api-key="${apiKey}"
  data-primary-color="${primaryColor}"
  data-position="${position}"
  data-welcome-message="${welcomeMessage}"
  async
></script>`
}

/**
 * Generate embed code for a given API key and settings
 * Utility function for use in server components or API routes
 */
export function generateEmbedCode(config: {
  widgetUrl: string
  apiKey: string
  primaryColor: string
  position: string
  welcomeMessage: string
}): string {
  return generateEmbedScript(config)
}
