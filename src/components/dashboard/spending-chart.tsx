'use client'

import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartDataPoint {
  name: string
  amount: number
}

interface SpendingChartProps {
  chartData: ChartDataPoint[]
}

export default function SpendingChart({ chartData }: SpendingChartProps) {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-white/30">
        No spending data recorded
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-brand-accent)" stopOpacity={0.35}/>
            <stop offset="95%" stopColor="var(--color-brand-accent)" stopOpacity={0.0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10, 11, 20, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '11px',
          }}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="var(--color-brand-accent)"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorAmount)"
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
