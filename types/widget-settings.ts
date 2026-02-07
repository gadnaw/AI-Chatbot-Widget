import { z } from 'zod'

/**
 * Widget Settings Database Schema
 * 
 * CREATE TABLE widget_settings (
 *     tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
 *     primary_color TEXT DEFAULT '#3B82F6',
 *     position TEXT DEFAULT 'bottom-right',
 *     welcome_message TEXT DEFAULT 'Hi! How can I help you today?',
 *     button_text TEXT DEFAULT 'Chat',
 *     header_title TEXT DEFAULT 'Support Chat',
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */

/**
 * Widget position options
 */
export type WidgetPosition = 'bottom-right' | 'bottom-left'

/**
 * Widget settings as stored in the database
 */
export interface WidgetSettings {
  tenant_id: string
  primary_color: string
  position: WidgetPosition
  welcome_message: string
  button_text: string
  header_title: string
  updated_at: string | null
}

/**
 * Form data for widget settings (excludes tenant_id and updated_at)
 */
export interface WidgetSettingsFormData {
  primaryColor: string
  position: WidgetPosition
  welcomeMessage: string
  buttonText: string
  headerTitle: string
}

/**
 * Default widget settings for new tenants
 */
export const DEFAULT_WIDGET_SETTINGS: WidgetSettingsFormData = {
  primaryColor: '#3B82F6', // Blue-500
  position: 'bottom-right',
  welcomeMessage: 'Hi! How can I help you today?',
  buttonText: 'Chat',
  headerTitle: 'Support Chat'
}

/**
 * Default position value for database
 */
export const DEFAULT_POSITION: WidgetPosition = 'bottom-right'

/**
 * Default primary color value for database
 */
export const DEFAULT_PRIMARY_COLOR = '#3B82F6'

/**
 * Zod schema for widget settings form validation
 */
export const widgetSettingsSchema = z.object({
  primaryColor: z.string()
    .min(7, 'Color must be a valid hex code (e.g., #3B82F6)')
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g., #3B82F6)')
    .default(DEFAULT_PRIMARY_COLOR),
  position: z.enum(['bottom-right', 'bottom-left'])
    .default(DEFAULT_POSITION),
  welcomeMessage: z.string()
    .min(1, 'Welcome message is required')
    .max(200, 'Welcome message must be 200 characters or less')
    .default(DEFAULT_WIDGET_SETTINGS.welcomeMessage),
  buttonText: z.string()
    .min(1, 'Button text is required')
    .max(50, 'Button text must be 50 characters or less')
    .default(DEFAULT_WIDGET_SETTINGS.buttonText),
  headerTitle: z.string()
    .min(1, 'Header title is required')
    .max(50, 'Header title must be 50 characters or less')
    .default(DEFAULT_WIDGET_SETTINGS.headerTitle)
})

/**
 * Type inferred from Zod schema for form usage
 */
export type WidgetSettingsSchema = z.infer<typeof widgetSettingsSchema>

/**
 * Widget preview props for live preview component
 */
export interface WidgetPreviewProps {
  primaryColor: string
  position: WidgetPosition
  welcomeMessage: string
  buttonText: string
  headerTitle: string
  isOpen?: boolean
}

/**
 * Position mapping for CSS classes
 */
export const POSITION_CLASSES: Record<WidgetPosition, string> = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4'
}

/**
 * Position mapping for mobile (always centered bottom on mobile)
 */
export const MOBILE_POSITION_CLASSES: Record<WidgetPosition, string> = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4'
}
