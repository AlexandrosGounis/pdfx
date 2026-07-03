import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { computeLayout } from './canvas/layout'
import { Toolbar } from './components/Toolbar'
import { FullView } from './components/FullView'
import { CollectionCanvas } from './components/CollectionCanvas'
import type { CanvasHandle } from './components/Canvas'
import { useCollection } from './app/useCollection'
import { useFullView } from './app/useFullView'
import { useExport } from './app/useExport'
import { useImport } from './app/useImport'
import { usePaste } from './app/usePaste'
import { useDragController } from './app/useDragController'
import { useKeyboardShortcuts } from './app/useKeyboardShortcuts'
import { useFind } from './app/useFind'
import { useSearchIndex } from './search/useSearchIndex'
import { FindProvider } from './search/FindContext'
import { FindBar } from './components/FindBar'
import { SignatureCapture } from './components/signing/SignatureCapture'

const TOAST_MS = 4000

export default function App(): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [scale, setScale] = useState(1)
  const [renderVersion, setRenderVersion] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [showSignatures, setShowSignatures] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasRef = useRef<CanvasHandle | null>(null)

  const flash = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  const collection = useCollection(flash)
  const fullViewState = useFullView()
  const docs = collection.docs
  const layout = useMemo(() => computeLayout(docs), [docs])

  const searchIndex = useSearchIndex(docs)
  const find = useFind(searchIndex.search, searchIndex.version)
  const findState = useMemo(
    () => ({
      active: find.active,
      query: find.matchedQuery,
      matchingDocIds: find.result.docIds,
      matchingPageIds: find.result.pageIds,
      getOcrWords: searchIndex.getOcrWords
    }),
    [find.active, find.matchedQuery, find.result, searchIndex.getOcrWords]
  )

  const { exportCollection, exportZip } = useExport(docs, setBusy, flash)
  const { addFiles, openViaDialog, addPagesToDoc, handleExternalDropFiles } = useImport(
    collection,
    setBusy,
    flash
  )
  const { handlePaste } = usePaste(collection, addFiles, setBusy, flash)

  const drag = useDragController({
    layout,
    canvasRef,
    movePageInto: collection.movePageInto,
    movePageToNewDoc: collection.movePageToNewDoc,
    onExternalDrop: handleExternalDropFiles
  })

  const onPaste = useCallback(() => void handlePaste(), [handlePaste])
  useKeyboardShortcuts({
    active: !fullViewState.fullView,
    selected: collection.selected,
    onDeletePage: collection.deletePage,
    onCopy: collection.copySelected,
    onPaste,
    onClearSelection: collection.clearSelection,
    findOpen: find.open,
    onOpenFind: find.openFind,
    onCloseFind: find.closeFind
  })

  const onScaleChange = useCallback((next: number) => setScale(next), [])
  const onSettle = useCallback(() => setRenderVersion((v) => v + 1), [])

  const fullViewRef = fullViewState.fullViewRef
  useEffect(() => {
    return window.api.onZoom((action) => {
      if (fullViewRef.current) return
      if (action === 'in') canvasRef.current?.zoomIn()
      else if (action === 'out') canvasRef.current?.zoomOut()
      else canvasRef.current?.reset()
    })
  }, [fullViewRef])

  useEffect(() => {
    return window.api.onMenu((action) => {
      if (action === 'open') void openViaDialog()
      else if (action === 'export-pdfx') void exportCollection('pdfx')
      else if (action === 'export-pdf') void exportCollection('pdf')
      else if (action === 'export-zip') void exportZip()
    })
  }, [openViaDialog, exportCollection, exportZip])

  const totalPages = docs.reduce((sum, d) => sum + d.pages.length, 0)
  const { fullView } = fullViewState
  const fullViewDoc = fullView ? docs.find((d) => d.id === fullView.docId) : undefined

  return (
    <FindProvider value={findState}>
      <div
        className={
          'app' + (drag.committing ? ' committing' : '') + (drag.dragKind ? ' dragging' : '')
        }
        onDragEnter={drag.handlers.onDragEnter}
        onDragOver={drag.handlers.onDragOver}
        onDragLeave={drag.handlers.onDragLeave}
        onDrop={drag.handlers.onDrop}
      >
        <Toolbar
          documentCount={docs.length}
          pageCount={totalPages}
          busy={busy}
          zoom={scale}
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
          onZoomReset={() => canvasRef.current?.reset()}
          onOpen={openViaDialog}
          onExportPdf={() => exportCollection('pdf')}
          onExportZip={exportZip}
          onOpenSignatures={() => setShowSignatures(true)}
        />

        {find.open && (
          <FindBar
            query={find.query}
            result={find.result}
            ocrRemaining={searchIndex.ocrRemaining}
            hasScanned={searchIndex.hasScanned}
            ocrLanguage={searchIndex.ocrLanguage}
            onQuery={find.setQuery}
            onOcrLanguage={searchIndex.setOcrLanguage}
            onClose={find.closeFind}
          />
        )}

        <CollectionCanvas
          docs={docs}
          layout={layout}
          busy={busy}
          pagesDraggable={totalPages >= 2}
          renderVersion={renderVersion}
          selected={collection.selected}
          hiddenPageId={fullViewState.hiddenPageId}
          dragKind={drag.dragKind}
          draggingPage={drag.draggingPage}
          dropTarget={drag.dropTarget}
          collapsedId={drag.collapsedId}
          externalCount={drag.externalCount}
          canvasRef={canvasRef}
          onScaleChange={onScaleChange}
          onSettle={onSettle}
          onBackgroundClick={collection.clearSelection}
          onOpen={openViaDialog}
          onSelectPage={collection.selectPage}
          onOpenPage={fullViewState.openPage}
          onPageDragStart={drag.startPageDrag}
          onPageDragEnd={drag.clearDrag}
          onAddPage={addPagesToDoc}
          onMoveDoc={collection.moveDoc}
          onRemoveDoc={collection.removeDoc}
          onRenameDoc={collection.renameDoc}
        />

        {fullView && fullViewDoc && (
          <FullView
            docs={docs}
            startDocId={fullView.docId}
            startPageId={fullView.pageId}
            originRect={fullView.originRect}
            onActivePageChange={fullViewState.setHiddenPageId}
            onClose={fullViewState.closeFullView}
          />
        )}

        {showSignatures && <SignatureCapture onClose={() => setShowSignatures(false)} />}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </FindProvider>
  )
}
