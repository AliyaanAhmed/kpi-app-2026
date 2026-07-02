import * as Select from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface SelectOption {
  value: string
  label: string
}

interface AppSelectProps {
  value: string
  onValueChange(value: string): void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function AppSelect({ value, onValueChange, options, placeholder = 'Select', className, disabled }: AppSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-xl border border-border bg-surface-raised px-3 text-left text-sm text-text outline-none transition hover:bg-surface focus:border-primary disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown className="h-4 w-4 text-muted" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="z-[80] max-h-72 overflow-hidden rounded-2xl border border-border bg-surface-raised p-1 shadow-modal"
          position="popper"
          sideOffset={6}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2.5 text-sm font-medium text-text outline-none transition-colors duration-150 data-[highlighted]:bg-primary-tint data-[highlighted]:text-primary"
                key={option.value}
                value={option.value}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
