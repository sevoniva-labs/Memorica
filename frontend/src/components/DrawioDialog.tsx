import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Button from '@douyinfe/semi-ui-19/lib/es/button'
import Modal from '@douyinfe/semi-ui-19/lib/es/modal'
import { Check, Loader2, X } from 'lucide-react'
import type { DiagramAttrs } from '../extensions/Diagram'

interface Props {
  open: boolean
  initialXml?: string
  initialTitle?: string
  onCancel: () => void
  onSave: (value: DiagramAttrs) => void
}

const EMPTY_DRAWIO_XML =
  '<mxfile host="embed.diagrams.net"><diagram name="第 1 页"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>'

function drawioUrl() {
  const base = import.meta.env.VITE_DRAWIO_URL || 'https://embed.diagrams.net/'
  const url = new URL(base)
  url.searchParams.set('embed', '1')
  url.searchParams.set('proto', 'json')
  url.searchParams.set('spin', '1')
  url.searchParams.set('ui', 'min')
  url.searchParams.set('libraries', '1')
  url.searchParams.set('saveAndExit', '1')
  return url.toString()
}

function parseDrawioMessage(data: unknown) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, string>
    } catch {
      return null
    }
  }
  if (typeof data === 'object' && data !== null) {
    return data as Record<string, string>
  }
  return null
}

export default function DrawioDialog({ open, initialXml, initialTitle, onCancel, onSave }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pendingXmlRef = useRef(initialXml || EMPTY_DRAWIO_XML)
  const saveTimerRef = useRef<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('图示编辑器加载中')
  const src = useMemo(() => drawioUrl(), [])

  const postToDrawio = useCallback((payload: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(payload), '*')
  }, [])

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [])

  const requestExport = useCallback((xml: string) => {
    pendingXmlRef.current = xml
    postToDrawio({
      action: 'export',
      format: 'svg',
      xml,
      spin: '正在生成预览',
    })
  }, [postToDrawio])

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.source !== iframeRef.current?.contentWindow) return
    const payload = parseDrawioMessage(event.data)
    if (!payload?.event) return

    if (payload.event === 'init') {
      pendingXmlRef.current = initialXml || EMPTY_DRAWIO_XML
      postToDrawio({
        action: 'load',
        autosave: 1,
        modified: 'unsavedChanges',
        title: `${initialTitle || '图示'}.drawio`,
        xml: pendingXmlRef.current,
      })
      setMessage('可以开始编辑图示')
      return
    }

    if (payload.event === 'save' && payload.xml) {
      requestExport(payload.xml)
      return
    }

    if (payload.event === 'export') {
      clearSaveTimer()
      setSaving(false)
      onSave({
        xml: payload.xml || pendingXmlRef.current,
        svg: payload.data || '',
        title: initialTitle || '图示',
        updatedAt: new Date().toISOString(),
      })
      return
    }

    if (payload.event === 'exit') {
      clearSaveTimer()
      setSaving(false)
      onCancel()
    }
  }, [clearSaveTimer, initialTitle, initialXml, onCancel, onSave, postToDrawio, requestExport])

  useEffect(() => {
    if (!open) return
    const resetTimer = window.setTimeout(() => {
      setSaving(false)
      setMessage('图示编辑器加载中')
    }, 0)
    pendingXmlRef.current = initialXml || EMPTY_DRAWIO_XML
    window.addEventListener('message', handleMessage)
    return () => {
      window.clearTimeout(resetTimer)
      clearSaveTimer()
      window.removeEventListener('message', handleMessage)
    }
  }, [clearSaveTimer, handleMessage, initialXml, open])

  const handleSave = () => {
    setSaving(true)
    setMessage('正在保存图示')
    postToDrawio({ action: 'save' })
    clearSaveTimer()
    saveTimerRef.current = window.setTimeout(() => {
      setSaving(false)
      setMessage('保存没有响应，请重试')
    }, 12000)
  }

  return (
    <Modal
      title={initialTitle || '图示'}
      visible={open}
      width="88vw"
      maskClosable={false}
      closeOnEsc={false}
      bodyStyle={{ padding: 0 }}
      footer={(
        <div className="memorica-drawio-footer">
          <span>{message}</span>
          <div>
            <Button icon={<X size={15} />} onClick={onCancel}>
              取消
            </Button>
            <Button
              theme="solid"
              type="primary"
              icon={saving ? <Loader2 size={15} className="memorica-spin-icon" /> : <Check size={15} />}
              loading={saving}
              onClick={handleSave}
            >
              保存图示
            </Button>
          </div>
        </div>
      )}
      onCancel={onCancel}
    >
      <div className="memorica-drawio-frame-wrap">
        {open && (
          <iframe
            ref={iframeRef}
            key={`${initialTitle || 'diagram'}-${initialXml?.length || 0}`}
            src={src}
            title="图示编辑器"
            className="memorica-drawio-frame"
          />
        )}
      </div>
    </Modal>
  )
}
