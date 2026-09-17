import { useNow } from '../hooks/useNow'

export function DateTimeLine() {
  const now = useNow()
  const text = now.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return <p className="text-xs text-stone-500">{text}</p>
}
