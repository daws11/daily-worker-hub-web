"use client"

import * as React from "react"
import { Bell, Users, Calendar, DollarSign, Briefcase, Clock } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

export interface NotificationPreference {
  pushEnabled: boolean
  newApplications: boolean
  bookingStatus: boolean
  paymentConfirmation: boolean
  newJobMatches: boolean
  shiftReminders: boolean
}

interface NotificationSettingsProps {
  preferences: NotificationPreference
  onPreferencesChange: (preferences: NotificationPreference) => void
  isLoading?: boolean
}

export function NotificationSettings({
  preferences,
  onPreferencesChange,
  isLoading = false
}: NotificationSettingsProps) {
  const updatePreference = <K extends keyof NotificationPreference>(
    key: K,
    value: NotificationPreference[K]
  ) => {
    onPreferencesChange({ ...preferences, [key]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage your push notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Push Notification Toggle */}
        <div className="flex items-center justify-between space-x-2 pb-4 border-b">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="push-enabled" className="text-base font-medium">
                Enable Push Notifications
              </label>
            </div>
            <p className="text-sm text-muted-foreground">
              Receive notifications directly on your device
            </p>
          </div>
          <Switch
            id="push-enabled"
            checked={preferences.pushEnabled}
            onCheckedChange={(checked) => updatePreference("pushEnabled", checked)}
            disabled={isLoading}
          />
        </div>

        {/* Individual Notification Types */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Notification Types</h3>

          {/* New Applications */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="new-applications" className="text-sm font-medium">
                  New Applications
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Get notified when workers apply to your jobs
              </p>
            </div>
            <Switch
              id="new-applications"
              checked={preferences.newApplications}
              onCheckedChange={(checked) => updatePreference("newApplications", checked)}
              disabled={isLoading || !preferences.pushEnabled}
            />
          </div>

          {/* Booking Status */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="booking-status" className="text-sm font-medium">
                  Booking Status Changes
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Updates on your booking status (accepted, rejected, etc.)
              </p>
            </div>
            <Switch
              id="booking-status"
              checked={preferences.bookingStatus}
              onCheckedChange={(checked) => updatePreference("bookingStatus", checked)}
              disabled={isLoading || !preferences.pushEnabled}
            />
          </div>

          {/* Payment Confirmations */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="payment-confirmation" className="text-sm font-medium">
                  Payment Confirmations
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Notifications when payments are processed
              </p>
            </div>
            <Switch
              id="payment-confirmation"
              checked={preferences.paymentConfirmation}
              onCheckedChange={(checked) => updatePreference("paymentConfirmation", checked)}
              disabled={isLoading || !preferences.pushEnabled}
            />
          </div>

          {/* New Job Matches */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="new-job-matches" className="text-sm font-medium">
                  New Job Matches
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Discover new jobs matching your skills and location
              </p>
            </div>
            <Switch
              id="new-job-matches"
              checked={preferences.newJobMatches}
              onCheckedChange={(checked) => updatePreference("newJobMatches", checked)}
              disabled={isLoading || !preferences.pushEnabled}
            />
          </div>

          {/* Shift Reminders */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="shift-reminders" className="text-sm font-medium">
                  Shift Reminders
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Get reminded 2 hours before your shift starts
              </p>
            </div>
            <Switch
              id="shift-reminders"
              checked={preferences.shiftReminders}
              onCheckedChange={(checked) => updatePreference("shiftReminders", checked)}
              disabled={isLoading || !preferences.pushEnabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
