'use client'

import { useState, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  disabled?: boolean
}

/**
 * Reusable color picker component
 * Combines visual color input with hex text input
 */
export function ColorPicker({
  value,
  onChange,
  label,
  error,
  disabled = false
}: ColorPickerProps) {
  const [colorValue, setColorValue] = useState(value)
  const [textValue, setTextValue] = useState(value)
  const [isValid, setIsValid] = useState(true)

  // Validate hex color format
  const isValidHex = useCallback((hex: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(hex)
  }, [])

  // Sync when value prop changes
  useEffect(() => {
    setColorValue(value)
    setTextValue(value)
    setIsValid(isValidHex(value))
  }, [value, isValidHex])

  // Handle color input change
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setColorValue(newColor)
    setTextValue(newColor)
    setIsValid(true)
    onChange(newColor)
  }

  // Handle text input change
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value
    setTextValue(newText)
    
    if (isValidHex(newText)) {
      setColorValue(newText)
      setIsValid(true)
      onChange(newText)
    } else if (newText === '' || newText.startsWith('#')) {
      setIsValid(false)
    }
  }

  // Handle text input blur (normalize color)
  const handleTextBlur = () => {
    if (!isValidHex(textValue) && textValue !== '') {
      // Don't change if invalid
      setTextValue(colorValue)
      setIsValid(true)
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="color-picker">
          {label}
        </Label>
      )}
      
      <div className="flex gap-2 items-center">
        {/* Visual Color Picker */}
        <div className="relative flex-shrink-0">
          <input
            type="color"
            value={colorValue}
            onChange={handleColorChange}
            disabled={disabled}
            className="w-10 h-10 rounded cursor-pointer border border-input bg-transparent p-0"
            style={{ 
              appearance: 'none',
              WebkitAppearance: 'none',
              padding: 0,
            }}
            id="color-picker"
          />
        </div>

        {/* Color Preview */}
        <div 
          className="w-10 h-10 rounded border border-input flex-shrink-0"
          style={{ backgroundColor: isValid ? colorValue : 'transparent' }}
        />

        {/* Hex Text Input */}
        <Input
          type="text"
          value={textValue}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder="#3B82F6"
          disabled={disabled}
          className={`flex-1 font-mono uppercase ${!isValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          maxLength={7}
        />
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
