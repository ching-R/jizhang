import * as SwitchPrimitive from '@radix-ui/react-switch'

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className="relative h-8 w-14 shrink-0 rounded-full bg-line outline-none transition-colors data-[state=checked]:bg-accent focus-visible:ring-2 focus-visible:ring-accent"
    >
      <SwitchPrimitive.Thumb className="block h-7 w-7 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[26px]" />
    </SwitchPrimitive.Root>
  )
}
