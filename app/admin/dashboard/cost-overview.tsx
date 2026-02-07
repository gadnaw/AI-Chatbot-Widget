'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/cost-tracker'


/**
 * Cost summary data from API
 */
export interface CostSummaryData {
  currentMonth: number
  projectedMonth: number
  dailyAverage: number
  monthToDateTokens: number
  tier: 'free' | 'basic' | 'pro'
  limit: number
  usagePercent: number
  remainingBudget: number
}


/**
 * Daily usage data for charts
 */
export interface DailyUsageData {
  date: string
  totalCost: number
  promptTokens: number
  completionTokens: number
  requestCount: number
}


/**
 * Cost Overview Dashboard Component
 * 
 * Displays cost monitoring and usage statistics for the admin dashboard.
 * Includes cost summary cards, usage charts, and budget alerts.
 */
export function CostOverview() {
  const [costSummary, setCostSummary] = useState<CostSummaryData | null>(null)
  const [dailyUsage, setDailyUsage] = useState<DailyUsageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Load cost data on mount
  useEffect(() => {
    async function loadCostData() {
      try {
        setLoading(true)
        
        // TODO: Replace with actual API calls
        // const [summaryRes, usageRes] = await Promise.all([
        //   fetch('/api/admin/costs/summary'),
        //   fetch('/api/admin/costs/daily?days=30')
        // ])
        // const summary = await summaryRes.json()
        // const usage = await usageRes.json()
        // setCostSummary(summary)
        // setDailyUsage(usage)
        
        // Mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 500))
        
        setCostSummary({
          currentMonth: 23.45,
          projectedMonth: 31.20,
          dailyAverage: 1.17,
          monthToDateTokens: 45678,
          tier: 'basic',
          limit: 10000,
          usagePercent: 23.45,
          remainingBudget: 9976.55,
        })
        
        setDailyUsage([
          { date: '2024-01-01', totalCost: 0.89, promptTokens: 1200, completionTokens: 800, requestCount: 45 },
          { date: '2024-01-02', totalCost: 1.12, promptTokens: 1500, completionTokens: 1000, requestCount: 52 },
          { date: '2024-01-03', totalCost: 0.95, promptTokens: 1300, completionTokens: 850, requestCount: 48 },
          { date: '2024-01-04', totalCost: 1.34, promptTokens: 1800, completionTokens: 1200, requestCount: 58 },
          { date: '2024-01-05', totalCost: 1.08, promptTokens: 1450, completionTokens: 950, requestCount: 50 },
          { date: '2024-01-06', totalCost: 0.76, promptTokens: 1000, completionTokens: 700, requestCount: 38 },
          { date: '2024-01-07', totalCost: 1.21, promptTokens: 1600, completionTokens: 1100, requestCount: 55 },
        ])
        
      } catch (err) {
        console.error('Failed to load cost data:', err)
        setError('Failed to load cost data')
      } finally {
        setLoading(false)
      }
    }
    
    loadCostData()
  }, [])
  
  // Calculate trend
  const getTrend = () => {
    if (!dailyUsage || dailyUsage.length < 2) return 'stable'
    
    const recent = dailyUsage.slice(-3).reduce((sum, d) => sum + d.totalCost, 0) / 3
    const previous = dailyUsage.slice(-7, -3).reduce((sum, d) => sum + d.totalCost, 0) / 4
    
    if (recent > previous * 1.1) return 'up'
    if (recent < previous * 0.9) return 'down'
    return 'stable'
  }
  
  const trend = getTrend()
  
  if (loading) {
    return <CostOverviewSkeleton />
  }
  
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (!costSummary) {
    return null
  }
  
  return (
    <div className="space-y-6">
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Current Month Spend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costSummary.currentMonth)}</div>
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
              {trend === 'stable' && <Minus className="h-3 w-3 text-yellow-500" />}
              <span className="text-xs text-muted-foreground">
                {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}
              </span>
            </div>
            <Progress value={costSummary.usagePercent} className="mt-2" />
          </CardContent>
        </Card>
        
        {/* Projected Month Spend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Month</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costSummary.projectedMonth)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on daily average
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              {formatCurrency(costSummary.dailyAverage)}/day
            </div>
          </CardContent>
        </Card>
        
        {/* Daily Average */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costSummary.dailyAverage)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 7 days
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              {formatNumber(costSummary.monthToDateTokens).toLocaleString()} tokens
            </div>
          </CardContent>
        </Card>
        
        {/* Budget Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
            <div className={`h-2 w-2 rounded-full ${
              costSummary.usagePercent >= 90 ? 'bg-red-500 animate-pulse' :
              costSummary.usagePercent >= 75 ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{costSummary.tier}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(costSummary.usagePercent)} utilized
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              {formatCurrency(costSummary.remainingBudget)} remaining
            </div>
          </CardContent>
        </Card>
        
      </div>
      
      {/* Budget Alerts */}
      {costSummary.usagePercent >= 75 && (
        <AlertCard usagePercent={costSummary.usagePercent} tier={costSummary.tier} />
      )}
      
      {/* Usage Charts */}
      <Tabs defaultValue="daily" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="daily">
              <BarChart3 className="h-4 w-4 mr-2" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="tokens">
              <PieChart className="h-4 w-4 mr-2" />
              Tokens
            </TabsTrigger>
          </TabsList>
          
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Spend</CardTitle>
              <CardDescription>
                API costs over the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-end gap-2">
                {dailyUsage.map((day, index) => (
                  <div 
                    key={day.date} 
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div 
                      className="w-full bg-primary rounded-t transition-all"
                      style={{ 
                        height: `${(day.totalCost / Math.max(...dailyUsage.map(d => d.totalCost))) * 150}px`,
                        minHeight: '4px'
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Token Usage</CardTitle>
              <CardDescription>
                Prompt vs completion tokens over the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-end gap-2">
                {dailyUsage.map((day) => (
                  <div 
                    key={day.date} 
                    className="flex-1 flex flex-col items-center gap-0"
                  >
                    {/* Completion tokens stack */}
                    <div 
                      className="w-full bg-primary/60 rounded-t"
                      style={{ 
                        height: `${(day.completionTokens / Math.max(...dailyUsage.flatMap(d => [d.promptTokens, d.completionTokens]))) * 150}px`,
                        minHeight: '2px'
                      }}
                    />
                    {/* Prompt tokens */}
                    <div 
                      className="w-full bg-primary"
                      style={{ 
                        height: `${(day.promptTokens / Math.max(...dailyUsage.flatMap(d => [d.promptTokens, d.completionTokens]))) * 150}px`,
                        minHeight: '2px'
                      }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary/60" />
                  <span className="text-sm text-muted-foreground">Completion</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span className="text-sm text-muted-foreground">Prompt</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
    </div>
  )
}


/**
 * Alert banner for budget warnings
 */
function AlertCard({ usagePercent, tier }: { usagePercent: number; tier: string }) {
  const isCritical = usagePercent >= 100
  const isWarning = usagePercent >= 75 && usagePercent < 100
  
  return (
    <Card className={isCritical ? 'border-destructive bg-destructive/5' : 'border-yellow-500 bg-yellow-500/5'}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className={`h-5 w-5 ${isCritical ? 'text-destructive' : 'text-yellow-600'}`} />
          <div>
            <h4 className="font-semibold">
              {isCritical ? 'Budget Exceeded' : 'Budget Warning'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {isCritical 
                ? `You've exceeded your ${tier} tier budget. Upgrade your plan or contact support.`
                : `You've used ${formatPercent(usagePercent)} of your ${tier} tier budget.`
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


/**
 * Loading skeleton for cost overview
 */
function CostOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[80px] mb-2" />
              <Skeleton className="h-3 w-[60px]" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-4 w-[200px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
