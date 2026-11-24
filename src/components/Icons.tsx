import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
    className: `h-6 w-6 ${props.className ?? ''}`,
  }
}

export function IconBook(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 4.5h9.5A2.5 2.5 0 0 1 18 7v12.5H8.5A2.5 2.5 0 0 0 6 17V4.5z" />
      <path d="M6 17a2.5 2.5 0 0 1 2.5-2.5H18" />
      <path d="M9 8h6M9 11.5h6" />
    </svg>
  )
}

export function IconList(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 7h11M8 12h11M8 17h11" />
      <path d="M4.5 7h.01M4.5 12h.01M4.5 17h.01" />
    </svg>
  )
}

export function IconChart(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 19V10M10 19V5M15 19v-6M20 19V8" />
    </svg>
  )
}

export function IconUser(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
    </svg>
  )
}

export function IconBackspace(props: IconProps) {
  return (
    <svg {...base(props)} className={`h-6 w-6 ${props.className ?? ''}`}>
      <path d="M8 6h11.2A1.8 1.8 0 0 1 21 7.8v8.4a1.8 1.8 0 0 1-1.8 1.8H8L3.8 12 8 6z" />
      <path d="M11 9.5 16 14.5M16 9.5 11 14.5" />
    </svg>
  )
}

export function IconChevron({ direction, ...props }: IconProps & { direction: 'left' | 'right' }) {
  return (
    <svg {...base(props)}>
      {direction === 'left' ? <path d="M14.5 6 8.5 12l6 6" /> : <path d="M9.5 6 15.5 12l-6 6" />}
    </svg>
  )
}
