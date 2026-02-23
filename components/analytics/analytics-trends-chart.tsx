import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface AnalyticsTrendsChartProps {
  data: Array<{
    label: string
    count: number
  }>
  color?: string
  height?: number
}

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('id-ID').format(value)
}

export function AnalyticsTrendsChart({
  data,
  color = '#10b981',
  height = 300,
}: AnalyticsTrendsChartProps) {
  return (
    <div style={{
      padding: '1rem',
      border: '1px solid #e5e7eb',
      borderRadius: '0.375rem',
      backgroundColor: 'white',
    }}>
      <h3 style={{
        fontSize: '0.875rem',
        fontWeight: 500,
        color: '#6b7280',
        margin: '0 0 1rem 0',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Tren Musiman
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            style={{ fontSize: '0.75rem', fill: '#6b7280' }}
            tick={{ fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tickFormatter={formatNumber}
            style={{ fontSize: '0.75rem', fill: '#6b7280' }}
            tick={{ fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
            }}
            formatter={(value: number) => [formatNumber(value), 'Pekerja']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
