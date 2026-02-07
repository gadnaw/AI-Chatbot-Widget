'use client'

import { useState, useEffect, useRef } from 'react'
import { WidgetPreviewProps, POSITION_CLASSES } from '@/types/widget-settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, X, Minimize2 } from 'lucide-react'

/**
 * Live widget preview component
 * Shows how the widget will appear based on current settings
 */
export function WidgetPreview({
  primaryColor,
  position,
  welcomeMessage,
  buttonText,
  headerTitle
}: WidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const positionClass = POSITION_CLASSES[position]

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Live Preview</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Preview Container */}
        <div className="relative w-full h-[400px] bg-slate-100 rounded-lg overflow-hidden border-2 border-dashed border-slate-300">
          
          {/* Website Placeholder */}
          <div className="absolute inset-0 p-4">
            <div className="w-full h-full bg-white rounded shadow-sm">
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-5/6" />
                <div className="h-8 bg-slate-100 rounded w-full mt-4" />
              </div>
            </div>
          </div>

          {/* Widget Preview */}
          <div className={`absolute ${positionClass} transition-all duration-300`}>
            
            {/* Chat Window */}
            {isOpen && !isMinimized && (
              <div className="mb-2 w-[320px] bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                {/* Header */}
                <div 
                  className="px-4 py-3 text-white flex items-center justify-between"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="font-semibold">{headerTitle}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setIsMinimized(true)}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Welcome Message */}
                <div className="p-4 space-y-3 bg-slate-50 min-h-[150px]">
                  <div className="flex gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <MessageCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 shadow-sm border border-slate-200 max-w-[200px]">
                      <p className="text-sm text-slate-700">{welcomeMessage}</p>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-slate-200 bg-white">
                  <div className="w-full px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-500">
                    Type a message...
                  </div>
                </div>
              </div>
            )}

            {/* Minimized State */}
            {isMinimized && (
              <button
                onClick={() => setIsMinimized(false)}
                className="mb-2 px-4 py-2 bg-white rounded-lg shadow-lg border border-slate-200 flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200"
              >
                <MessageCircle className="h-4 w-4" style={{ color: primaryColor }} />
                <span className="text-sm font-medium text-slate-700">{headerTitle}</span>
              </button>
            )}

            {/* Chat Button */}
            <button
              onClick={() => {
                setIsOpen(!isOpen)
                setIsMinimized(false)
              }}
              className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              {isOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <MessageCircle className="h-6 w-6 text-white" />
              )}
            </button>
          </div>

          {/* Position Label */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded">
            Preview: {position.replace('-', ' ')}
          </div>
        </div>

        {/* Preview Info */}
        <div className="mt-3 text-xs text-muted-foreground text-center">
          <p>This preview shows exactly how your widget will appear on your website.</p>
          <p className="mt-1">Click the button to test the chat window interaction.</p>
        </div>
      </CardContent>
    </Card>
  )
}
