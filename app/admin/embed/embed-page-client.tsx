'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateKey } from '@/lib/api-keys'
import { getWidgetSettings, initializeSettings } from '@/lib/widget-settings'
import { ApiKeyManager } from './api-key-manager'
import { EmbedCode } from './embed-code'
import Link from 'next/link'
import { ApiKey } from '@/types/api-keys'
import { WidgetSettings } from '@/types/widget-settings'

interface EmbedPageClientProps {
  initialApiKey: ApiKey
  initialWidgetSettings: WidgetSettings
}

export function EmbedPageClient({ initialApiKey, initialWidgetSettings }: EmbedPageClientProps) {
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [plaintextKey, setPlaintextKey] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)

  const handleKeyRegenerated = async (newApiKey: ApiKey, newPlaintextKey: string) => {
    setApiKey(newApiKey)
    setPlaintextKey(newPlaintextKey)
  }

  return (
    <div className="container mx-auto py-10">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Embed Code</h1>
        <p className="text-gray-600">
          Get the code to embed the AI chatbot widget on your website
        </p>
      </div>

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: API Key Management */}
        <div>
          <ApiKeyManager 
            apiKey={apiKey} 
            onKeyRegenerated={handleKeyRegenerated}
          />
        </div>

        {/* Right Column: Embed Code */}
        <div>
          <EmbedCode 
            apiKeyPrefix={plaintextKey || apiKey.prefix}
            widgetSettings={initialWidgetSettings}
          />
        </div>
      </div>

      {/* Testing and Troubleshooting */}
      <div className="mt-8 bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-4">Testing Your Widget</h2>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <h3 className="font-medium text-gray-900">Open Your Website</h3>
            </div>
            <p className="text-sm text-gray-600">
              Navigate to your website where you installed the widget
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <h3 className="font-medium text-gray-900">Look for the Widget</h3>
            </div>
            <p className="text-sm text-gray-600">
              You should see a chat bubble in the {initialWidgetSettings.position.replace('-', ' ')} corner
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <h3 className="font-medium text-gray-900">Test the Chat</h3>
            </div>
            <p className="text-sm text-gray-600">
              Click to open and send a test message to verify functionality
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-blue-200">
          <h3 className="font-medium text-blue-800 mb-3">Troubleshooting</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-3">
              <span className="font-medium text-blue-700 min-w-[120px]">Widget not appearing?</span>
              <span className="text-gray-700">
                Check browser console for errors and verify the embed code was copied correctly
              </span>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="font-medium text-blue-700 min-w-[120px]">Wrong appearance?</span>
              <span className="text-gray-700">
                Refresh the page to load the latest widget settings from your customization
              </span>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="font-medium text-blue-700 min-w-[120px]">API key issues?</span>
              <span className="text-gray-700">
                Verify the API key in the embed code matches what you see in your dashboard
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link 
          href="/admin/settings"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Customize Widget
        </Link>
        <Link 
          href="/admin/sources"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Manage Training Data
        </Link>
        <Link 
          href="/admin/conversations"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          View Conversations
        </Link>
      </div>
    </div>
  )
}
