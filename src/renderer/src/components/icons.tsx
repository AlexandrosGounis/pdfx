interface IconProps {
  size?: number
  strokeWidth?: number
}

const DEFAULT_SIZE = 16
const DEFAULT_STROKE_WIDTH = 2

function Icon({
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  children
}: IconProps & { children: React.ReactNode }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function ChevronUpIcon(props: IconProps): React.JSX.Element {
  return (
    <Icon {...props}>
      <path d="m18 15-6-6-6 6" />
    </Icon>
  )
}

export function ChevronDownIcon(props: IconProps): React.JSX.Element {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  )
}

export function ChevronLeftIcon(props: IconProps): React.JSX.Element {
  return (
    <Icon {...props}>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  )
}

export function ChevronRightIcon(props: IconProps): React.JSX.Element {
  return (
    <Icon {...props}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps): React.JSX.Element {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps): React.JSX.Element {
  return (
    <Icon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  )
}

export function MinusIcon(props: IconProps): React.JSX.Element {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  )
}

export function SearchIcon(props: IconProps): React.JSX.Element {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  )
}

export function GitHubIcon({ size = DEFAULT_SIZE }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

export function HighlighterIcon(props: IconProps): React.JSX.Element {
  return (
    <Icon {...props}>
      <path d="m9 11-6 6v3h9l3-3" />
      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
    </Icon>
  )
}

export function TapeIcon({ size = DEFAULT_SIZE }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2.5" y="8.5" width="19" height="7" rx="2.5" transform="rotate(-8 12 12)" />
    </svg>
  )
}

export function ImportArrowIcon(props: IconProps): React.JSX.Element {
  return (
    <Icon {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </Icon>
  )
}
