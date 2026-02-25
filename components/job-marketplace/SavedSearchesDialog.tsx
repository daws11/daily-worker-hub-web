"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { SavedSearch, JobFilters } from '@/lib/types/job'
import { getSavedSearches, createSavedSearch, deleteSavedSearch, toggleSavedSearchFavorite } from '@/lib/api/saved-searches'
import { toast } from 'sonner'
import {
  Search,
  Bookmark,
  Trash2,
  Star,
  Calendar,
  MapPin,
  Banknote,
  Briefcase,
  Loader2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SavedSearchesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFilters: JobFilters
  onLoadSearch: (filters: JobFilters) => void
  workerId?: string
}

interface SavedSearchWithFilters extends SavedSearch {
  filterCount: number
}

export function SavedSearchesDialog({
  open,
  onOpenChange,
  currentFilters,
  onLoadSearch,
  workerId,
}: SavedSearchesDialogProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearchWithFilters[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [newSearchName, setNewSearchName] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)

  // Fetch saved searches when dialog opens
  useEffect(() => {
    if (open && workerId) {
      fetchSavedSearches()
    }
  }, [open, workerId])

  const fetchSavedSearches = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await getSavedSearches(workerId)
      if (error) {
        toast.error('Failed to load saved searches')
        return
      }

      const searchesWithCount = (data || []).map(search => ({
        ...search,
        filterCount: Object.keys(search.filters || {}).filter(
          key => search.filters[key as keyof JobFilters] !== undefined && search.filters[key as keyof JobFilters] !== ''
        ).length,
      }))

      setSavedSearches(searchesWithCount)
    } catch (err) {
      toast.error('Failed to load saved searches')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSearch = async () => {
    if (!newSearchName.trim()) {
      toast.error('Please enter a name for your search')
      return
    }

    if (!workerId) {
      toast.error('You must be logged in to save searches')
      return
    }

    setIsSaving(true)
    try {
      const { data, error } = await createSavedSearch(workerId, {
        name: newSearchName.trim(),
        filters: currentFilters,
      })

      if (error) {
        toast.error('Failed to save search')
        return
      }

      toast.success('Search saved successfully')
      setNewSearchName('')
      setShowSaveForm(false)
      await fetchSavedSearches()
    } catch (err) {
      toast.error('Failed to save search')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadSearch = (search: SavedSearch) => {
    onLoadSearch(search.filters)
    onOpenChange(false)
    toast.success(`Loaded search: ${search.name}`)
  }

  const handleDeleteSearch = async (id: string) => {
    setIsDeleting(id)
    try {
      const { error } = await deleteSavedSearch(id)
      if (error) {
        toast.error('Failed to delete search')
        return
      }

      toast.success('Search deleted')
      await fetchSavedSearches()
    } catch (err) {
      toast.error('Failed to delete search')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      const { error } = await toggleSavedSearchFavorite(id)
      if (error) {
        toast.error('Failed to update favorite')
        return
      }

      await fetchSavedSearches()
    } catch (err) {
      toast.error('Failed to update favorite')
    }
  }

  const getFilterSummary = (filters: JobFilters): string[] => {
    const summary: string[] = []

    if (filters.search) {
      summary.push(`Search: "${filters.search}"`)
    }

    if (filters.positionType) {
      summary.push(`Position: ${filters.positionType.replace('_', ' ')}`)
    }

    if (filters.area) {
      summary.push(`Area: ${filters.area}`)
    }

    if (filters.radius) {
      summary.push(`Within ${filters.radius}km`)
    }

    if (filters.wageMin !== undefined || filters.wageMax !== undefined) {
      const min = filters.wageMin ? `Rp${(filters.wageMin / 1000).toFixed(0)}k` : 'Any'
      const max = filters.wageMax ? `Rp${(filters.wageMax / 1000).toFixed(0)}k` : 'Any'
      summary.push(`Wage: ${min} - ${max}`)
    }

    if (filters.isUrgent) {
      summary.push('Urgent only')
    }

    if (filters.verifiedOnly) {
      summary.push('Verified only')
    }

    if (filters.deadlineAfter) {
      summary.push(`After: ${new Date(filters.deadlineAfter).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`)
    }

    if (filters.deadlineBefore) {
      summary.push(`Before: ${new Date(filters.deadlineBefore).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`)
    }

    return summary
  }

  const hasCurrentFilters = Object.keys(currentFilters).some(
    key => currentFilters[key as keyof JobFilters] !== undefined && currentFilters[key as keyof JobFilters] !== ''
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Saved Searches
          </DialogTitle>
          <DialogDescription>
            Save your favorite filter combinations for quick access
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Save Current Search Section */}
          {hasCurrentFilters && (
            <div className="pb-4 border-b">
              {!showSaveForm ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowSaveForm(true)}
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save Current Filters
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="search-name">Search Name</Label>
                    <Input
                      id="search-name"
                      placeholder="e.g., Bali Hospitality Jobs"
                      value={newSearchName}
                      onChange={(e) => setNewSearchName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveSearch()
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveSearch}
                      disabled={isSaving || !newSearchName.trim()}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-4 w-4 mr-2" />
                          Save Search
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowSaveForm(false)
                        setNewSearchName('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Saved Searches List */}
          <div className="flex-1 min-h-0 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedSearches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No saved searches yet</p>
                <p className="text-sm text-muted-foreground">
                  Save your current filters to access them quickly later
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-3">
                  {savedSearches
                    .sort((a, b) => {
                      // Favorites first
                      if (a.is_favorite && !b.is_favorite) return -1
                      if (!a.is_favorite && b.is_favorite) return 1
                      // Then by date (newest first)
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    })
                    .map((search) => (
                      <div
                        key={search.id}
                        className={cn(
                          "group relative rounded-lg border p-4 transition-all hover:shadow-md",
                          search.is_favorite && "border-primary/50 bg-primary/5"
                        )}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium truncate">{search.name}</h3>
                              {search.is_favorite && (
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {search.filterCount} filter{search.filterCount !== 1 ? 's' : ''} • Saved{' '}
                              {new Date(search.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleFavorite(search.id)}
                              title={search.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              {search.is_favorite ? (
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              ) : (
                                <Star className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteSearch(search.id)}
                              disabled={isDeleting === search.id}
                              title="Delete search"
                            >
                              {isDeleting === search.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Filter Summary */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {getFilterSummary(search.filters).map((summary, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {summary}
                            </Badge>
                          ))}
                          {getFilterSummary(search.filters).length === 0 && (
                            <span className="text-sm text-muted-foreground">No filters set</span>
                          )}
                        </div>

                        {/* Load Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => handleLoadSearch(search)}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Load Search
                        </Button>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
