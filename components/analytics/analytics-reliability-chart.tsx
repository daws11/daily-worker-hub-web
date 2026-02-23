import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface AnalyticsReliabilityChartProps {
  data: Array<{
    label: string
    reliability: number
  }>
  color?: string
  height?: number
}

const formatScore = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value)
}

export function AnalyticsReliabilityChart({
  data,
  color = '#10b981',
  height = 300,
}: AnalyticsReliabilityChartProps) {
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
        Skor Reliabilitas
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            style={{ fontSize: '0.75rem', fill: '#6b7280' }}
            tick={{ fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tickFormatter={formatScore}
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
            formatter={(value: number) => [formatScore(value), 'Skor Reliabilitas']}
          />
          <Line
            type="monotone"
            dataKey="reliability"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
