import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal } from 'antd'
import { CheckOutlined, CloseOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons'
import type { DiagramAttrs } from '../extensions/Diagram'
import { BLANK_DIAGRAM_XML } from '../diagram/templates'

interface Props {
  open: boolean
  initialXml?: string
  initialTitle?: string
  onCancel: () => void
  onSave: (value: DiagramAttrs) => void
}

type DrawioState = 'loading' | 'ready' | 'saving' | 'timeout' | 'error' | 'canceling'

const DRAWIO_STATE_MESSAGES: Record<DrawioState, string> = {
  loading: '图示编辑器加载中',
  ready: '可以开始编辑图示',
  saving: '正在保存图示',
  timeout: '保存没有响应，请重试',
  error: '图示编辑器出现异常，请重试',
  canceling: '正在取消图示',
}

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
  const pendingXmlRef = useRef(initialXml || BLANK_DIAGRAM_XML)
  const saveTimerRef = useRef<number | null>(null)
  const cancelTimerRef = useRef<number | null>(null)
  const [state, setState] = useState<DrawioState>('loading')
  const stateRef = useRef<DrawioState>('loading')
  const src = useMemo(() => drawioUrl(), [])
  const message = DRAWIO_STATE_MESSAGES[state]
  const saving = state === 'saving'
  const canceling = state === 'canceling'
  const retryable = state === 'timeout' || state === 'error'

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const postToDrawio = useCallback((payload: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(payload), '*')
  }, [])

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [])

  const clearCancelTimer = useCallback(() => {
    if (cancelTimerRef.current) {
      window.clearTimeout(cancelTimerRef.current)
      cancelTimerRef.current = null
    }
  }, [])

  const cancelDrawio = useCallback(() => {
    clearSaveTimer()
    clearCancelTimer()
    setState('canceling')
    cancelTimerRef.current = window.setTimeout(() => {
      cancelTimerRef.current = null
      onCancel()
    }, 150)
  }, [clearCancelTimer, clearSaveTimer, onCancel])

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
    if (stateRef.current === 'canceling') return

    if (payload.event === 'init') {
      pendingXmlRef.current = initialXml || BLANK_DIAGRAM_XML
      postToDrawio({
        action: 'load',
        autosave: 1,
        modified: 'unsavedChanges',
        title: `${initialTitle || '图示'}.drawio`,
        xml: pendingXmlRef.current,
      })
      if (stateRef.current !== 'saving' && stateRef.current !== 'timeout') {
        setState('ready')
      }
      return
    }

    if (payload.event === 'save' && payload.xml) {
      requestExport(payload.xml)
      return
    }

    if (payload.event === 'export') {
      clearSaveTimer()
      setState('ready')
      onSave({
        xml: payload.xml || pendingXmlRef.current,
        svg: payload.data || '',
        title: initialTitle || '图示',
        updatedAt: new Date().toISOString(),
      })
      return
    }

    if (payload.event === 'error') {
      clearSaveTimer()
      setState('error')
      return
    }

    if (payload.event === 'exit') {
      cancelDrawio()
    }
  }, [cancelDrawio, clearSaveTimer, initialTitle, initialXml, onSave, postToDrawio, requestExport])

  useEffect(() => {
    if (!open) return
    pendingXmlRef.current = initialXml || BLANK_DIAGRAM_XML
    return () => {
      clearSaveTimer()
      clearCancelTimer()
    }
  }, [clearCancelTimer, clearSaveTimer, initialXml, open])

  useEffect(() => {
    if (!open) return
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage, open])

  const handleSave = () => {
    if (canceling) return
    setState('saving')
    postToDrawio({ action: 'save' })
    clearSaveTimer()
    saveTimerRef.current = window.setTimeout(() => {
      setState('timeout')
    }, 12000)
  }

  return (
    <Modal
      title={initialTitle || '图示'}
      open={open}
      width="88vw"
      maskClosable={false}
      keyboard={false}
      styles={{ body: { padding: 0 } }}
      footer={(
        <div className="memorica-drawio-footer">
          <span data-testid="memorica-drawio-status">{message}</span>
          <div>
            <Button icon={<CloseOutlined />} disabled={canceling} onClick={cancelDrawio}>
              取消
            </Button>
            <Button
              type="primary"
              icon={saving ? <LoadingOutlined spin /> : retryable ? <ReloadOutlined /> : <CheckOutlined />}
              loading={saving}
              disabled={canceling}
              onClick={handleSave}
            >
              {retryable ? '重试保存' : '保存图示'}
            </Button>
          </div>
        </div>
      )}
      onCancel={cancelDrawio}
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
