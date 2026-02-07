"use client"

import { useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Search, X } from "lucide-react"
import { format } from "date-fns"

interface ConversationsFilterProps {
  initialSearch?: string
  initialFrom?: string
  initialTo?: string
}

export function ConversationsFilter({
  initialSearch,
  initialFrom,
  initialTo,
}: ConversationsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(initialSearch || "")
  const [fromDate, setFromDate] = useState<Date | undefined>(
    initialFrom ? new Date(initialFrom) : undefined
  )
  const [toDate, setToDate] = useState<Date | undefined>(
    initialTo ? new Date(initialTo) : undefined
  )
  const [isFromOpen, setIsFromOpen] = useState(false)
  const [isToOpen, setIsToOpen] = useState(false)

  const updateFilters = useCallback((newSearch?: string, newFrom?: string, newTo?: string) => {
    const params = new URLSearchParams()
    if (newSearch) params.set('search', newSearch)
    if (newFrom) params.set('from', newFrom)
    if (newTo) params.set('to', newTo)
    router.push(`/admin/conversations?${params.toString()}`)
  }, [router])

  const handleSearch = () => {
    updateFilters(
      search || undefined,
      fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined,
      toDate ? format(toDate, 'yyyy-MM-dd') : undefined
    )
  }

  const handleClearFilters = () => {
    setSearch("")
    setFromDate(undefined)
    setToDate(undefined)
    router.push("/admin/conversations")
  }

  const hasFilters = search || fromDate || toDate

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium mb-1.5 block">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by session ID or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">From Date</label>
        <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-[160px] justify-start text-left font-normal ${
                fromDate ? "" : "text-muted-foreground"
              }`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fromDate ? format(fromDate, 'MMM d, yyyy') : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(date) => {
                setFromDate(date)
                setIsFromOpen(false)
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">To Date</label>
        <Popover open={isToOpen} onOpenChange={setIsToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-[160px] justify-start text-left font-normal ${
                toDate ? "" : "text-muted-foreground"
              }`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {toDate ? format(toDate, 'MMM d, yyyy') : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={(date) => {
                setToDate(date)
                setIsToOpen(false)
              }}
              initialFocus
              disabled={(date) => fromDate ? date < fromDate : false}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button onClick={handleSearch} variant="secondary">
        Apply Filters
      </Button>

      {hasFilters && (
        <Button onClick={handleClearFilters} variant="ghost">
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  )
}
