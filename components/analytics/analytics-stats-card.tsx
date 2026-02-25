import type { LucideIcon } from 'lucide-react'

export interface AnalyticsStatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'gray' | 'red'
}

const colorMap = {
  blue: '#2563eb',
  green: '#10b981',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  gray: '#6b7280',
  red: '#ef4444',
}

const bgIconColorMap = {
  blue: '#dbeafe',
  green: '#d1fae5',
  orange: '#fed7aa',
  purple: '#ede9fe',
  gray: '#f3f4f6',
  red: '#fee2e2',
}

export function AnalyticsStatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue'
}: AnalyticsStatsCardProps) {
  const valueColor = colorMap[color]
  const iconBgColor = bgIconColorMap[color]
  const iconColor = valueColor

  return (
    <div style={{
      padding: '1rem',
      border: '1px solid #e5e7eb',
      borderRadius: '0.375rem',
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      {/* Header with Icon and Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}>
        <h3 style={{
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#6b7280',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {title}
        </h3>
        <div style={{
          width: '2rem',
          height: '2rem',
          borderRadius: '0.375rem',
          backgroundColor: iconBgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Icon style={{ width: '1.125rem', height: '1.125rem', color: iconColor }} />
        </div>
      </div>

      {/* Value */}
      <p style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        color: valueColor,
        margin: 0,
        lineHeight: 1
      }}>
        {value}
      </p>

      {/* Trend Indicator */}
      {trend && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.75rem',
          fontWeight: 500,
          color: trend.isPositive ? '#10b981' : '#ef4444'
        }}>
          <span style={{ fontSize: '0.875rem' }}>
            {trend.isPositive ? '↑' : '↓'}
          </span>
          <span>
            {Math.abs(trend.value)}%
          </span>
          <span style={{ color: '#9ca3af', fontWeight: 400 }}>
            vs periode sebelumnya
          </span>
        </div>
      )}
    </div>
  )
}
