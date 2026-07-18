import { memo } from 'react'
import type { PageEntry } from '../types'
import type { OcrWord } from '../ocr/types'
import type { Mark } from '../edit/types'
import { hasAnyValue } from '../forms/types'
import type { FormValues } from '../forms/types'
import { pageDisplayWidth } from '../canvas/layout'
import { PageView } from './PageView'
import { MarkLayer } from './MarkLayer'
import { FormLayer } from './forms/FormLayer'
import { buildPageDragImage } from './page-drag-image'

interface PageCellProps {
  docId: string
  page: PageEntry
  pageHeight: number
  renderVersion: number
  selected: boolean
  collapsed: boolean
  hidden: boolean
  dimmed: boolean
  highlightQuery: string | undefined
  ocrWords: OcrWord[] | undefined
  marks: Mark[] | undefined
  formValues: FormValues | undefined
  pagesDraggable: boolean
  visibleNumber: number
  onSelectPage: (docId: string, pageId: string) => void
  onOpenPage: (docId: string, pageId: string) => void
  onPageDragStart: (docId: string, pageId: string) => void
  onPageDragEnd: () => void
}

function PageCellImpl({
  docId,
  page,
  pageHeight,
  renderVersion,
  selected,
  collapsed,
  hidden,
  dimmed,
  highlightQuery,
  ocrWords,
  marks,
  formValues,
  pagesDraggable,
  visibleNumber,
  onSelectPage,
  onOpenPage,
  onPageDragStart,
  onPageDragEnd
}: PageCellProps): React.JSX.Element {
  return (
    <div
      data-page-id={page.id}
      className={
        'page' +
        (selected ? ' selected' : '') +
        (collapsed ? ' collapsing' : '') +
        (dimmed ? ' dimmed' : '')
      }
      style={
        collapsed
          ? {
              width: 0,
              height: pageHeight,
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none'
            }
          : {
              width: pageDisplayWidth(page.width, page.height),
              height: pageHeight,
              visibility: hidden ? 'hidden' : undefined
            }
      }
      draggable={pagesDraggable}
      onClick={(e) => {
        e.stopPropagation()
        onSelectPage(docId, page.id)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onOpenPage(docId, page.id)
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-pdfx-page', page.id)
        e.dataTransfer.effectAllowed = 'move'
        const el = e.currentTarget as HTMLElement
        const rect = el.getBoundingClientRect()
        const img = buildPageDragImage(el, rect)
        e.dataTransfer.setDragImage(img, e.clientX - rect.left, e.clientY - rect.top)
        window.setTimeout(() => img.remove(), 0)
        onPageDragStart(docId, page.id)
      }}
      onDragEnd={onPageDragEnd}
    >
      <PageView
        pdf={page.source.pdf}
        pageNumber={page.pageIndex + 1}
        naturalWidth={page.width}
        naturalHeight={page.height}
        version={renderVersion}
        highlightQuery={highlightQuery}
        ocrWords={ocrWords}
      />
      {hasAnyValue(formValues) && (
        <FormLayer
          pdf={page.source.pdf}
          pageNumber={page.pageIndex + 1}
          naturalHeight={page.height}
          values={formValues!}
          readOnly
        />
      )}
      {marks && marks.length > 0 && <MarkLayer marks={marks} />}
      <span className="page-number">{visibleNumber}</span>
    </div>
  )
}

export const PageCell = memo(PageCellImpl)
