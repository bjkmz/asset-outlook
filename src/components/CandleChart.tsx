import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import type { Candle, RangeKey } from '../types'

function toSeriesData(data: Candle[]): CandlestickData[] {
  return data.map((c) => ({
    time: c.t as UTCTimestamp,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
  }))
}

// Calendar duration in seconds for the requested view. Null = show all.
function getRangeDuration(rangeKey: RangeKey, lastT: number): number | null {
  const DAY = 86_400
  switch (rangeKey) {
    case '1d':
      return 1 * DAY
    case '5d':
      return 5 * DAY
    case '1Mo':
      return 30 * DAY
    case '3Mo':
      return 90 * DAY
    case '6mo':
      return 182 * DAY
    case '1Y':
      return 365 * DAY
    case '5y':
      return 5 * 365 * DAY
    case 'ytd': {
      const d = new Date(lastT * 1000)
      const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1) / 1000
      return Math.max(lastT - jan1, DAY)
    }
    case 'max':
      return null
  }
}

export function CandleChart({
  data,
  height = 140,
  compact = false,
  rangeKey,
}: {
  data: Candle[]
  height?: number
  compact?: boolean
  rangeKey?: RangeKey
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#78716c',
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: !compact, color: '#f5efe6' },
        horzLines: { color: '#f5efe6' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: !compact, fixLeftEdge: !compact },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#16a34a',
      downColor: '#dc2626',
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
      borderVisible: false,
    })
    chartRef.current = chart
    seriesRef.current = series
    const ro = new ResizeObserver((entries) => {
      chart.applyOptions({ width: entries[0].contentRect.width })
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [height, compact])

  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart) return
    series.setData(toSeriesData(data))
    if (compact || data.length === 0 || !rangeKey) {
      chart.timeScale().fitContent()
      return
    }
    const lastT = data[data.length - 1].t
    const duration = getRangeDuration(rangeKey, lastT)
    if (duration == null) {
      chart.timeScale().fitContent()
      return
    }
    const cutoff = lastT - duration
    const split = data.findIndex((c) => c.t >= cutoff)
    if (split <= 0) {
      chart.timeScale().fitContent()
      return
    }
    // Requested range in view; older over-fetched candles reachable by dragging.
    chart
      .timeScale()
      .setVisibleLogicalRange({ from: split, to: data.length })
  }, [data, compact, rangeKey])

  return <div ref={containerRef} className="w-full" />
}
