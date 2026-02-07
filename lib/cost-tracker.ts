// lib/cost-tracker.ts
/**
 * Cost Tracking Service for OpenAI API Usage
 * 
 * Tracks per-tenant usage of OpenAI API calls including:
 * - Token counts (prompt, completion, total)
 * - API costs (calculated from token usage)
 * - Usage by endpoint type
 * 
 * Uses Redis sorted sets for efficient time-based aggregation.
 */

import { createClient, RedisClientType } from 'redis';


/**
 * Configuration for OpenAI pricing
 * Prices are per 1,000 tokens
 */
const OPENAI_PRICING = {
  'gpt-4o-mini': {
    prompt: 0.01,      // $0.01 per 1K prompt tokens
    completion: 0.03,  // $0.03 per 1K completion tokens
  },
  'gpt-4o': {
    prompt: 2.50,       // $2.50 per 1K prompt tokens
    completion: 10.00, // $10.00 per 1K completion tokens
  },
  'gpt-4': {
    prompt: 30.00,     // $30.00 per 1K prompt tokens
    completion: 60.00, // $60.00 per 1K completion tokens
  },
  'gpt-3.5-turbo': {
    prompt: 0.50,       // $0.50 per 1K prompt tokens
    completion: 1.50,   // $1.50 per 1K completion tokens
  },
} as const;

export type OpenAIModel = keyof typeof OPENAI_PRICING;


/**
 * Usage record for a single API call
 */
export interface UsageRecord {
  tenantId: string
  date: Date
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
  endpoint: string
  model: OpenAIModel
  requestId?: string
}


/**
 * Cost summary for a tenant
 */
export interface CostSummary {
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
 * Daily usage aggregation
 */
export interface DailyUsage {
  date: string
  totalCost: number
  promptTokens: number
  completionTokens: number
  requestCount: number
}


/**
 * Monthly usage aggregation  
 */
export interface MonthlyUsage {
  month: string
  totalCost: number
  promptTokens: number
  completionTokens: number
  requestCount: number
  dailyBreakdown: DailyUsage[]
}


/**
 * Rate limit configuration per tier
 */
export const TIER_LIMITS = {
  free: {
    monthlyLimit: 1000,      // $1.00 per month
    dailyLimit: 100,         // 100 requests per day
    rateLimit: 10,            // 10 requests per minute
  },
  basic: {
    monthlyLimit: 10000,     // $10.00 per month
    dailyLimit: 1000,        // 1000 requests per day
    rateLimit: 100,          // 100 requests per minute
  },
  pro: {
    monthlyLimit: 100000,    // $100.00 per month
    dailyLimit: 10000,       // 10000 requests per day
    rateLimit: 500,          // 500 requests per minute
  },
} as const;

export type TenantTier = keyof typeof TIER_LIMITS;


/**
 * Cost Tracker Service
 * 
 * Singleton service for tracking OpenAI API costs per tenant.
 * Uses Redis for efficient storage and aggregation.
 */
export class CostTrackerService {
  private redis: RedisClientType | null = null
  private isConnected: boolean = false
  
  // Pricing for default model
  private defaultModel: OpenAIModel = 'gpt-4o-mini'
  
  
  /**
   * Initialize the cost tracker with Redis connection
   */
  async initialize(redisUrl?: string): Promise<void> {
    try {
      // For browser environments, we'll use a mock/client-side approach
      // In production, this would connect to a server-side Redis instance
      if (typeof window === 'undefined') {
        // Server-side Node.js environment
        const { createClient } = await import('redis');
        this.redis = createClient({ url: redisUrl || process.env.REDIS_URL });
        
        this.redis.on('error', (err) => {
          console.error('Redis CostTracker error:', err);
          this.isConnected = false;
        });
        
        await this.redis.connect();
        this.isConnected = true;
        console.log('CostTracker connected to Redis');
      } else {
        // Browser environment - use API endpoints
        console.log('CostTracker initialized in browser mode (using API)');
        this.isConnected = true;
      }
    } catch (error) {
      console.error('Failed to initialize CostTracker:', error);
      this.isConnected = false;
    }
  }
  
  
  /**
   * Track usage for a single API call
   */
  async trackUsage(record: Omit<UsageRecord, 'cost' | 'date'>): Promise<UsageRecord> {
    const usageRecord: UsageRecord = {
      ...record,
      date: new Date(),
      cost: this.calculateCost(record.promptTokens, record.completionTokens, record.model),
    };
    
    if (this.isConnected && this.redis) {
      try {
        await this._storeUsageRecord(usageRecord);
        await this._updateAggregates(usageRecord);
      } catch (error) {
        console.error('Failed to store usage record:', error);
      }
    }
    
    return usageRecord;
  }
  
  
  /**
   * Calculate cost for token usage
   */
  calculateCost(
    promptTokens: number, 
    completionTokens: number, 
    model: OpenAIModel = this.defaultModel
  ): number {
    const pricing = OPENAI_PRICING[model];
    if (!pricing) {
      console.warn(`Unknown model ${model}, using gpt-4o-mini pricing`);
      return this.calculateCost(promptTokens, completionTokens, 'gpt-4o-mini');
    }
    
    const promptCost = (promptTokens / 1000) * pricing.prompt;
    const completionCost = (completionTokens / 1000) * pricing.completion;
    
    return promptCost + completionCost;
  }
  
  
  /**
   * Get cost summary for a tenant
   */
  async getCostSummary(tenantId: string, tier: TenantTier = 'basic'): Promise<CostSummary> {
    const now = new Date();
    const currentMonth = this._getMonthKey(now);
    const daysInMonth = this._getDaysInMonth(now);
    const currentDay = now.getDate();
    
    // Calculate current month total
    const currentMonthTotal = await this._getMonthlyTotal(tenantId, currentMonth);
    
    // Calculate daily average
    const dailyAverage = currentMonthTotal / currentDay;
    
    // Project to end of month
    const projectedMonth = dailyAverage * daysInMonth;
    
    // Get token count
    const tokensThisMonth = await this._getMonthlyTokens(tenantId, currentMonth);
    
    // Calculate usage percentage
    const limit = TIER_LIMITS[tier].monthlyLimit;
    const usagePercent = (currentMonthTotal / limit) * 100;
    
    return {
      currentMonth: Math.round(currentMonthTotal * 100) / 100,
      projectedMonth: Math.round(projectedMonth * 100) / 100,
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      monthToDateTokens: tokensThisMonth,
      tier,
      limit,
      usagePercent: Math.round(usagePercent * 100) / 100,
      remainingBudget: Math.max(0, limit - currentMonthTotal),
    };
  }
  
  
  /**
   * Get daily usage breakdown for a date range
   */
  async getDailyUsage(
    tenantId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<DailyUsage[]> {
    const usage: DailyUsage[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = this._getDateKey(currentDate);
      const dailyData = await this._getDailyAggregate(tenantId, dateKey);
      
      usage.push({
        date: dateKey,
        ...dailyData,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return usage;
  }
  
  
  /**
   * Get monthly usage breakdown
   */
  async getMonthlyUsage(tenantId: string, months: number = 6): Promise<MonthlyUsage[]> {
    const usage: MonthlyUsage[] = [];
    const now = new Date();
    
    for (let i = 0; i < months; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = this._getMonthKey(monthDate);
      
      const monthData = await this._getMonthlyAggregate(tenantId, monthKey);
      
      // Get daily breakdown
      const daysInMonth = this._getDaysInMonth(monthDate);
      const startDate = new Date(monthDate);
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), daysInMonth);
      const dailyBreakdown = await this.getDailyUsage(tenantId, startDate, endDate);
      
      usage.push({
        month: monthKey,
        ...monthData,
        dailyBreakdown,
      });
    }
    
    return usage;
  }
  
  
  /**
   * Check if tenant has exceeded their budget
   */
  async checkBudgetAlert(tenantId: string, tier: TenantTier): Promise<{
    isOverBudget: boolean
    usagePercent: number
    alertLevel: 'none' | 'warning' | 'critical'
  }> {
    const summary = await this.getCostSummary(tenantId, tier);
    
    const alertLevel: 'none' | 'warning' | 'critical' = 
      summary.usagePercent >= 100 ? 'critical' :
      summary.usagePercent >= 75 ? 'warning' : 'none';
    
    return {
      isOverBudget: summary.usagePercent >= 100,
      usagePercent: summary.usagePercent,
      alertLevel,
    };
  }
  
  
  /**
   * Reset usage for a tenant (admin function)
   */
  async resetUsage(tenantId: string): Promise<void> {
    if (!this.redis) return;
    
    try {
      const pattern = `usage:${tenantId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } catch (error) {
      console.error('Failed to reset tenant usage:', error);
    }
  }
  
  
  // Private methods for Redis operations
  
  private async _storeUsageRecord(record: UsageRecord): Promise<void> {
    if (!this.redis) return;
    
    const key = `usage:${record.tenantId}:records:${this._getMonthKey(record.date)}`;
    const member = JSON.stringify({
      ...record,
      date: record.date.toISOString(),
    });
    
    await this.redis.zAdd(key, {
      score: record.date.getTime(),
      member,
    });
    
    // Set expiry (keep 6 months of data)
    await this.redis.expire(key, 180 * 24 * 60 * 60);
  }
  
  
  private async _updateAggregates(record: UsageRecord): Promise<void> {
    if (!this.redis) return;
    
    const dateKey = this._getDateKey(record.date);
    const monthKey = this._getMonthKey(record.date);
    
    // Daily aggregate
    const dailyKey = `usage:${record.tenantId}:daily:${dateKey}`;
    await this.redis.hIncrBy(dailyKey, 'promptTokens', record.promptTokens);
    await this.redis.hIncrBy(dailyKey, 'completionTokens', record.completionTokens);
    await this.redis.hIncrBy(dailyKey, 'requestCount', 1);
    await this.redis.hIncrByFloat(dailyKey, 'totalCost', record.cost);
    await this.redis.expire(dailyKey, 30 * 24 * 60 * 60); // 30 days
    
    // Monthly aggregate
    const monthlyKey = `usage:${record.tenantId}:monthly:${monthKey}`;
    await this.redis.hIncrBy(monthlyKey, 'promptTokens', record.promptTokens);
    await this.redis.hIncrBy(monthlyKey, 'completionTokens', record.completionTokens);
    await this.redis.hIncrBy(monthlyKey, 'requestCount', 1);
    await this.redis.hIncrByFloat(monthlyKey, 'totalCost', record.cost);
    await this.redis.expire(monthlyKey, 180 * 24 * 60 * 60); // 6 months
  }
  
  
  private async _getMonthlyTotal(tenantId: string, monthKey: string): Promise<number> {
    if (!this.redis) return 0;
    
    const key = `usage:${tenantId}:monthly:${monthKey}`;
    const totalCost = await this.redis.hGet(key, 'totalCost');
    
    return parseFloat(totalCost || '0');
  }
  
  
  private async _getMonthlyTokens(tenantId: string, monthKey: string): Promise<number> {
    if (!this.redis) return 0;
    
    const key = `usage:${tenantId}:monthly:${monthKey}`;
    const promptTokens = await this.redis.hGet(key, 'promptTokens');
    const completionTokens = await this.redis.hGet(key, 'completionTokens');
    
    return (parseInt(promptTokens || '0')) + (parseInt(completionTokens || '0'));
  }
  
  
  private async _getDailyAggregate(tenantId: string, dateKey: string): Promise<{
    totalCost: number
    promptTokens: number
    completionTokens: number
    requestCount: number
  }> {
    if (!this.redis) {
      return { totalCost: 0, promptTokens: 0, completionTokens: 0, requestCount: 0 };
    }
    
    const key = `usage:${tenantId}:daily:${dateKey}`;
    const [totalCost, promptTokens, completionTokens, requestCount] = await Promise.all([
      this.redis.hGet(key, 'totalCost'),
      this.redis.hGet(key, 'promptTokens'),
      this.redis.hGet(key, 'completionTokens'),
      this.redis.hGet(key, 'requestCount'),
    ]);
    
    return {
      totalCost: parseFloat(totalCost || '0'),
      promptTokens: parseInt(promptTokens || '0'),
      completionTokens: parseInt(completionTokens || '0'),
      requestCount: parseInt(requestCount || '0'),
    };
  }
  
  
  private async _getMonthlyAggregate(tenantId: string, monthKey: string): Promise<{
    totalCost: number
    promptTokens: number
    completionTokens: number
    requestCount: number
  }> {
    if (!this.redis) {
      return { totalCost: 0, promptTokens: 0, completionTokens: 0, requestCount: 0 };
    }
    
    const key = `usage:${tenantId}:monthly:${monthKey}`;
    const [totalCost, promptTokens, completionTokens, requestCount] = await Promise.all([
      this.redis.hGet(key, 'totalCost'),
      this.redis.hGet(key, 'promptTokens'),
      this.redis.hGet(key, 'completionTokens'),
      this.redis.hGet(key, 'requestCount'),
    ]);
    
    return {
      totalCost: parseFloat(totalCost || '0'),
      promptTokens: parseInt(promptTokens || '0'),
      completionTokens: parseInt(completionTokens || '0'),
      requestCount: parseInt(requestCount || '0'),
    };
  }
  
  
  // Helper methods
  
  private _getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  
  private _getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  
  
  private _getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }
}


// Export singleton instance
export const costTracker = new CostTrackerService();


// Export utility functions

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}


/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}


/**
 * Format percentage with appropriate precision
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}


/**
 * Calculate token cost for a model
 */
export function getModelPricing(model: OpenAIModel): { prompt: number; completion: number } {
  return OPENAI_PRICING[model];
}


/**
 * Validate tier string
 */
export function isValidTier(tier: string): tier is TenantTier {
  return tier in TIER_LIMITS;
}


/**
 * Get tier limit configuration
 */
export function getTierLimits(tier: TenantTier) {
  return TIER_LIMITS[tier];
}
