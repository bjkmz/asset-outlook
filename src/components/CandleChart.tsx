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
import type { Candle } from '../types'

function toSeriesData(data: Candle[]): CandlestickData[] {
  return data.map((c) => ({
    time: c.t as UTCTimestamp,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
  }))
}

export function CandleChart({
  data,
  height = 140,
  compact = false,
}: {
  data: Candle[]
  height?: number
  compact?: boolean
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

const VISIBLE_BARS = 150

  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart) return
    series.setData(toSeriesData(data))
    if (!compact && data.length > VISIBLE_BARS) {
      // Latest 150 visible; older bars reachable by dragging, earliest clamped left.
      chart
        .timeScale()
        .setVisibleLogicalRange({ from: data.length - VISIBLE_BARS, to: data.length })
    } else {
      chart.timeScale().fitContent()
    }
  }, [data, compact])

  return <div ref={containerRef} className="w-full" />
}
