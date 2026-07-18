import type { FieldValue, FormFieldInfo } from '../../forms/types'

interface FormFieldBoxProps {
  field: FormFieldInfo
  scale: number
  value: FieldValue | undefined
  readOnly: boolean
  selectable: boolean
  onChange: ((fieldName: string, value: FieldValue) => void) | undefined
}

const stop = (event: React.SyntheticEvent): void => event.stopPropagation()

function fieldStyle(field: FormFieldInfo, scale: number): React.CSSProperties {
  return {
    left: `${field.rect.x * 100}%`,
    top: `${field.rect.y * 100}%`,
    width: `${field.rect.w * 100}%`,
    height: `${field.rect.h * 100}%`,
    fontSize: field.fontSize * scale
  }
}

function CheckboxField({ field, scale, value, readOnly, selectable, onChange }: FormFieldBoxProps) {
  const checked = value === true
  if (readOnly || selectable) {
    if (!checked) return null
    return (
      <div className="form-field checkbox checked" style={fieldStyle(field, scale)}>
        ✓
      </div>
    )
  }
  return (
    <button
      type="button"
      className={`form-field checkbox${checked ? ' checked' : ''}`}
      style={fieldStyle(field, scale)}
      onPointerDown={stop}
      onDoubleClick={stop}
      onClick={(event) => {
        stop(event)
        onChange?.(field.name, !checked)
      }}
    >
      {checked ? '✓' : ''}
    </button>
  )
}

function TextField({ field, scale, value, readOnly, selectable, onChange }: FormFieldBoxProps) {
  const text = typeof value === 'string' ? value : ''
  const style = fieldStyle(field, scale)
  if (selectable) {
    return (
      <div
        className={`form-field text${text ? ' filled' : ''}`}
        style={style}
        onPointerDown={text ? stop : undefined}
        onDoubleClick={text ? stop : undefined}
      >
        {text}
      </div>
    )
  }
  if (readOnly) {
    if (!text) return null
    return (
      <div className="form-field text filled" style={style}>
        {text}
      </div>
    )
  }
  const shared = {
    className: `form-field text${text ? ' filled' : ''}`,
    style,
    value: text,
    maxLength: field.maxLen ?? undefined,
    spellCheck: false,
    onPointerDown: stop,
    onDoubleClick: stop,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>): void => {
      if (event.key === 'Escape' || (event.key === 'Enter' && !field.multiline)) {
        event.currentTarget.blur()
      }
    }
  }
  if (field.multiline) {
    return <textarea {...shared} onChange={(e) => onChange?.(field.name, e.target.value)} />
  }
  return <input {...shared} type="text" onChange={(e) => onChange?.(field.name, e.target.value)} />
}

export function FormFieldBox(props: FormFieldBoxProps): React.JSX.Element | null {
  return props.field.kind === 'checkbox' ? CheckboxField(props) : TextField(props)
}
