import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { getFormFields } from '../../forms/extract'
import type { FieldValue, FormFieldInfo, FormValues } from '../../forms/types'
import type { EditTool } from '../../edit/types'
import { FormFieldBox } from './FormFieldBox'

interface FormLayerProps {
  pdf: PDFDocumentProxy
  pageNumber: number
  naturalHeight: number
  values: FormValues
  readOnly?: boolean
  selectTool?: EditTool | null
  onChange?: (fieldName: string, value: FieldValue) => void
}

export function FormLayer({
  pdf,
  pageNumber,
  naturalHeight,
  values,
  readOnly = false,
  selectTool = null,
  onChange
}: FormLayerProps): React.JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fields, setFields] = useState<FormFieldInfo[]>([])
  const [scale, setScale] = useState(0)

  useEffect(() => {
    let active = true
    void getFormFields(pdf, pageNumber).then((found) => {
      if (active) setFields(found)
    })
    return () => {
      active = false
    }
  }, [pdf, pageNumber])

  useEffect(() => {
    const el = containerRef.current
    if (!el || fields.length === 0) return
    const measure = (): void => setScale(el.clientHeight / naturalHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [naturalHeight, fields.length])

  if (fields.length === 0) return null
  const mode = readOnly ? ' readonly' : selectTool ? ` selectable ${selectTool}` : ''
  return (
    <div ref={containerRef} className={`form-layer${mode}`}>
      {scale > 0 &&
        fields.map((field) => (
          <FormFieldBox
            key={field.id}
            field={field}
            scale={scale}
            value={values[field.name]}
            readOnly={readOnly}
            selectable={!!selectTool}
            onChange={onChange}
          />
        ))}
    </div>
  )
}
