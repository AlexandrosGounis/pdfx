export type FieldKind = 'text' | 'checkbox'

export interface FieldRect {
  x: number
  y: number
  w: number
  h: number
}

export interface FormFieldInfo {
  id: string
  name: string
  kind: FieldKind
  rect: FieldRect
  fontSize: number
  multiline: boolean
  maxLen: number | null
}

export type FieldValue = string | boolean

export type FormValues = Record<string, FieldValue>

export type FormValuesBySource = Record<string, FormValues>

export const hasAnyValue = (values: FormValues | undefined): boolean =>
  !!values &&
  Object.values(values).some((v) => v === true || (typeof v === 'string' && v.length > 0))
