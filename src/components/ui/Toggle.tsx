interface ToggleProps {
  checked: boolean
  onChange: () => void
  color?: 'primary' | 'accent'
  size?: 'sm' | 'md'
  disabled?: boolean
}

export default function Toggle({
  checked,
  onChange,
  color = 'primary',
  size = 'md',
  disabled = false,
}: ToggleProps) {
  const trackOn = color === 'accent' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-primary)]'
  const trackOff = 'bg-[var(--color-border)]'

  const track = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6'
  const thumbSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  const thumbOn = size === 'sm' ? 'left-[18px]' : 'left-[22px]'
  const thumbOff = 'left-0.5'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative rounded-full transition-colors min-h-0 min-w-0 overflow-hidden disabled:opacity-40 ${track} ${checked ? trackOn : trackOff}`}
    >
      <span
        className={`absolute top-0.5 bg-white rounded-full shadow transition-all duration-200 ${thumbSize} ${checked ? thumbOn : thumbOff}`}
      />
    </button>
  )
}
