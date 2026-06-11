import { Select } from './Select'

interface TimePickerProps {
  value: string      // "HH:mm"
  onChange: (value: string) => void
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: String(i).padStart(2, '0'),
}))

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => ({
  value: String(m).padStart(2, '0'),
  label: String(m).padStart(2, '0'),
}))

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [hh, mm] = value.split(':')
  const hour   = hh ?? '09'
  const minute = mm ?? '00'

  // snap minute to nearest option if not in list
  const validMinute = MINUTE_OPTIONS.find(o => o.value === minute)?.value ?? '00'

  return (
    <div className="flex items-center gap-1">
      <div className="w-16">
        <Select
          size="sm"
          value={hour}
          onChange={h => onChange(`${h}:${validMinute}`)}
          options={HOUR_OPTIONS}
          placeholder="時"
        />
      </div>
      <span className="text-xs text-[var(--color-text-muted)] font-medium">:</span>
      <div className="w-16">
        <Select
          size="sm"
          value={validMinute}
          onChange={m => onChange(`${hour}:${m}`)}
          options={MINUTE_OPTIONS}
          placeholder="分"
        />
      </div>
    </div>
  )
}
