import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import type { PricePoint } from '../types'

export function PriceChart({
  data,
  height = 120,
}: {
  data: PricePoint[]
  height?: number
}) {
  const up = data.length > 1 && data[data.length - 1].price >= data[0].price
  const stroke = up ? '#16a34a' : '#dc2626'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip
          formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Price']}
          labelFormatter={() => ''}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke={stroke}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
