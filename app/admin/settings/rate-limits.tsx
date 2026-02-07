'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Settings, AlertTriangle, CheckCircle, DollarSign, Clock, Zap, Shield } from 'lucide-react'


/**
 * Rate limit configuration for a tenant
 */
export interface RateLimitConfig {
  tier: 'free' | 'basic' | 'pro'
  requestsPerMinute: number
  requestsPerDay: number
  monthlyBudget: number
  costAlert50: boolean
  costAlert75: boolean
  costAlert90: boolean
  customLimits: {
    chatRequestsPerMinute: number
    embedRequestsPerMinute: number
    adminRequestsPerMinute: number
  }
}


/**
 * Current usage statistics
 */
export interface UsageStats {
  requestsPerMinute: number
  requestsRemainingMinute: number
  requestsPerDay: number
  requestsRemainingDay: number
  monthlySpend: number
  monthlyLimit: number
  usagePercent: number
}
}


/**
 * Rate Limits Settings Component
 * 
 * Allows admins to configure rate limits and cost controls for their tenant.
 * Provides real-time usage display and budget alerts.
 */
export function RateLimitSettings() {
  const [config, setConfig] = useState<RateLimitConfig>({
    tier: 'basic',
    requestsPerMinute: 100,
    requestsPerDay: 10000,
    monthlyBudget: 10,
    costAlert50: true,
    costAlert75: true,
    costAlert90: true,
    customLimits: {
      chatRequestsPerMinute: 50,
      embedRequestsPerMinute: 200,
      adminRequestsPerMinute: 30,
    },
  })
  
  const [usage, setUsage] = useState<UsageStats>({
    requestsPerMinute: 23,
    requestsRemainingMinute: 77,
    requestsPerDay: 1247,
    requestsRemainingDay: 8753,
    monthlySpend: 2.34,
    monthlyLimit: 10,
    usagePercent: 23.4,
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [alertLevel, setAlertLevel] = useState<'none' | 'warning' | 'critical'>('none')
  
  // Fetch current configuration and usage on mount
  useEffect(() => {
    async function loadData() {
      try {
        // TODO: Replace with actual API calls
        // const [configRes, usageRes] = await Promise.all([
        //   fetch('/api/admin/rate-limits/config'),
        //   fetch('/api/admin/rate-limits/usage')
        // ])
        // const configData = await configRes.json()
        // const usageData = await usageRes.json()
        // setConfig(configData)
        // setUsage(usageData)
        
        // For demo, use mock data
        console.log('Loading rate limit configuration...')
      } catch (error) {
        console.error('Failed to load rate limit configuration:', error)
      }
    }
    
    loadData()
  }, [])
  
  // Update alert level based on usage
  useEffect(() => {
    if (usage.usagePercent >= 100) {
      setAlertLevel('critical')
    } else if (usage.usagePercent >= 75) {
      setAlertLevel('warning')
    } else {
      setAlertLevel('none')
    }
  }, [usage.usagePercent])
  
  // Handle tier change
  const handleTierChange = useCallback((tier: 'free' | 'basic' | 'pro') => {
    const tierLimits = {
      free: { rpm: 10, daily: 100, budget: 1 },
      basic: { rpm: 100, daily: 10000, budget: 10 },
      pro: { rpm: 500, daily: 100000, budget: 100 },
    }
    
    const limits = tierLimits[tier]
    
    setConfig(prev => ({
      ...prev,
      tier,
      requestsPerMinute: limits.rpm,
      requestsPerDay: limits.daily,
      monthlyBudget: limits.budget,
      customLimits: {
        chatRequestsPerMinute: Math.floor(limits.rpm * 0.5),
        embedRequestsPerMinute: limits.rpm * 2,
        adminRequestsPerMinute: Math.floor(limits.rpm * 0.3),
      },
    }))
  }, [])
  
  // Handle configuration save
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveStatus('idle')
    
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/admin/rate-limits/config', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(config),
      // })
      // if (!response.ok) throw new Error('Failed to save')
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSaveStatus('success')
      
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to save rate limit configuration:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }, [config])
  
  // Handle alert toggle
  const handleAlertToggle = useCallback((alertKey: keyof Pick<RateLimitConfig, 'costAlert50' | 'costAlert75' | 'costAlert90'>) => {
    setConfig(prev => ({
      ...prev,
      [alertKey]: !prev[alertKey],
    }))
  }, [])
  
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rate Limits & Cost Controls</h2>
          <p className="text-muted-foreground">
            Configure API rate limits and monitor your OpenAI usage costs.
          </p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="min-w-[100px]"
        >
          {isSaving ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saveStatus === 'success' ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
      
      {/* Alert Banner */}
      {alertLevel !== 'none' && (
        <Alert variant={alertLevel === 'critical' ? 'destructive' : 'warning'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {alertLevel === 'critical' ? 'Budget Exceeded' : 'Budget Warning'}
          </AlertTitle>
          <AlertDescription>
            {alertLevel === 'critical' 
              ? 'You have exceeded your monthly budget. Upgrade your tier or contact support.'
              : `You have used ${usage.usagePercent.toFixed(1)}% of your monthly budget.`
            }
          </AlertDescription>
        </Alert>
      )}
      
      {/* Usage Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests / Minute</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.requestsPerMinute}</div>
            <p className="text-xs text-muted-foreground">
              {usage.requestsRemainingMinute} remaining
            </p>
            <Progress 
              value={(usage.requestsPerMinute / config.requestsPerMinute) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests / Day</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.requestsPerDay.toLocaleString()}</div>
            <p className="uted-foreground">
              {usage.requestsRemainingDay.totext-xs text-mLocaleString()} remaining
            </p>
            <Progress 
              value={(usage.requestsPerDay / config.requestsPerDay) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${usage.monthlySpend.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              of ${config.monthlyBudget.toFixed(2)} limit
            </p>
            <Progress 
              value={usage.usagePercent}
              className="mt-2"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{config.tier}</div>
            <p className="text-xs text-muted-foreground">
              {usage.usagePercent.toFixed(1)}% utilized
            </p>
            <div className="mt-2 flex gap-1">
              <div className={`h-2 w-full rounded ${config.costAlert50 ? 'bg-green-500' : 'bg-gray-200'}`} />
              <div className={`h-2 w-full rounded ${config.costAlert75 ? 'bg-yellow-500' : 'bg-gray-200'}`} />
              <div className={`h-2 w-full rounded ${config.costAlert90 ? 'bg-red-500' : 'bg-gray-200'}`} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tier Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Tier</CardTitle>
          <CardDescription>
            Choose a tier to automatically configure rate limits and budgets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(['free', 'basic', 'pro'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => handleTierChange(tier)}
                className={`relative flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                  config.tier === tier
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {config.tier === tier && (
                  <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-primary" />
                )}
                <h3 className="text-lg font-semibold capitalize">{tier}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {tier === 'free' && 'For testing and small projects'}
                  {tier === 'basic' && 'For production applications'}
                  {tier === 'pro' && 'For high-volume applications'}
                </p>
                <div className="mt-4 text-center">
                  <div className="text-2xl font-bold">
                    {tier === 'free' && '$1'}
                    {tier === 'basic' && '$10'}
                    {tier === 'pro' && '$100'}
                  </div>
                  <div className="text-xs text-muted-foreground">/month</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Endpoint-Specific Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoint-Specific Limits</CardTitle>
          <CardDescription>
            Customize rate limits for different API endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Chat Endpoints (RPM)</label>
              <input
                type="number"
                value={config.customLimits.chatRequestsPerMinute}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  customLimits: {
                    ...prev.customLimits,
                    chatRequestsPerMinute: parseInt(e.target.value) || 0
                  }
                }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Chat completions API
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Embed Endpoints (RPM)</label>
              <input
                type="number"
                value={config.customLimits.embedRequestsPerMinute}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  customLimits: {
                    ...prev.customLimits,
                    embedRequestsPerMinute: parseInt(e.target.value) || 0
                  }
                }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Embeddings API
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Endpoints (RPM)</label>
              <input
                type="number"
                value={config.customLimits.adminRequestsPerMinute}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  customLimits: {
                    ...prev.customLimits,
                    adminRequestsPerMinute: parseInt(e.target.value) || 0
                  }
                }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Admin API endpoints
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Budget Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Alerts</CardTitle>
          <CardDescription>
            Configure when to receive alerts about your spending.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'costAlert50', label: '50% Budget Used', description: 'Alert when you reach 50% of your monthly budget' },
            { key: 'costAlert75', label: '75% Budget Used', description: 'Alert when you reach 75% of your monthly budget' },
            { key: 'costAlert90', label: '90% Budget Used', description: 'Alert when you reach 90% of your monthly budget' },
          ].map((alert) => (
            <div 
              key={alert.key}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div className="space-y-0.5">
                <label className="text-sm font-medium">{alert.label}</label>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
              </div>
              <button
                onClick={() => handleAlertToggle(alert.key as keyof Pick<RateLimitConfig, 'costAlert50' | 'costAlert75' | 'costAlert90'>)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config[alert.key as keyof RateLimitConfig]
                    ? 'bg-primary'
                    : 'bg-input'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                    config[alert.key as keyof RateLimitConfig]
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
      
    </div>
  )
}
