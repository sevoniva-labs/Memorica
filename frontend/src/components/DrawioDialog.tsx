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

type DrawioState = 'loading' | 'ready' | 'saving' | 'timeout' | 'error' | 'canceling' | 'initTimeout'

const DRAWIO_STATE_MESSAGES: Record<DrawioState, string> = {
  loading: '图示编辑器加载中',
  ready: '可以开始编辑图示',
  saving: '正在保存图示',
  timeout: '保存没有响应，请重试',
  error: '图示编辑器出现异常，请重试',
  canceling: '正在取消图示',
  initTimeout: '图示编辑器加载超时，请重新加载',
}

const DRAWIO_INIT_TIMEOUT_MS = 15_000
const DRAWIO_SAVE_TIMEOUT_MS = 12_000

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
  const initTimerRef = useRef<number | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const cancelTimerRef = useRef<number | null>(null)
  const [state, setState] = useState<DrawioState>('loading')
  const [frameNonce, setFrameNonce] = useState(0)
  const stateRef = useRef<DrawioState>('loading')
  const src = useMemo(() => drawioUrl(), [])
  const message = DRAWIO_STATE_MESSAGES[state]
  const saving = state === 'saving'
  const canceling = state === 'canceling'
  const retryable = state === 'timeout' || state === 'error'
  const initTimedOut = state === 'initTimeout'

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

  const clearInitTimer = useCallback(() => {
    if (initTimerRef.current) {
      window.clearTimeout(initTimerRef.current)
      initTimerRef.current = null
    }
  }, [])

  const scheduleInitTimeout = useCallback(() => {
    clearInitTimer()
    initTimerRef.current = window.setTimeout(() => {
      initTimerRef.current = null
      if (stateRef.current === 'loading') {
        setState('initTimeout')
      }
    }, DRAWIO_INIT_TIMEOUT_MS)
  }, [clearInitTimer])

  const clearCancelTimer = useCallback(() => {
    if (cancelTimerRef.current) {
      window.clearTimeout(cancelTimerRef.current)
      cancelTimerRef.current = null
    }
  }, [])

  const cancelDrawio = useCallback(() => {
    clearInitTimer()
    clearSaveTimer()
    clearCancelTimer()
    setState('canceling')
    cancelTimerRef.current = window.setTimeout(() => {
      cancelTimerRef.current = null
      onCancel()
    }, 150)
  }, [clearCancelTimer, clearInitTimer, clearSaveTimer, onCancel])

  const reloadDrawio = useCallback(() => {
    clearSaveTimer()
    clearCancelTimer()
    setState('loading')
    setFrameNonce((value) => value + 1)
    scheduleInitTimeout()
  }, [clearCancelTimer, clearSaveTimer, scheduleInitTimeout])

  const requestExport = useCallback((xml?: string) => {
    if (xml) pendingXmlRef.current = xml
    const payload: Record<string, unknown> = {
      action: 'export',
      format: 'svg',
      spin: '正在生成预览',
    }
    if (xml) payload.xml = xml
    postToDrawio(payload)
  }, [postToDrawio])

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.source !== iframeRef.current?.contentWindow) return
    const payload = parseDrawioMessage(event.data)
    if (!payload?.event) return
    if (stateRef.current === 'canceling') return

    if (payload.event === 'init') {
      clearInitTimer()
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
      clearInitTimer()
      clearSaveTimer()
      setState('error')
      return
    }

    if (payload.event === 'exit') {
      cancelDrawio()
    }
  }, [cancelDrawio, clearInitTimer, clearSaveTimer, initialTitle, initialXml, onSave, postToDrawio, requestExport])

  useEffect(() => {
    if (!open) return
    pendingXmlRef.current = initialXml || BLANK_DIAGRAM_XML
    scheduleInitTimeout()
    return () => {
      clearInitTimer()
      clearSaveTimer()
      clearCancelTimer()
    }
  }, [clearCancelTimer, clearInitTimer, clearSaveTimer, initialXml, open, scheduleInitTimeout])

  useEffect(() => {
    if (!open) return
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage, open])

  const handleSave = () => {
    if (canceling) return
    setState('saving')
    requestExport()
    clearSaveTimer()
    saveTimerRef.current = window.setTimeout(() => {
      setState('timeout')
    }, DRAWIO_SAVE_TIMEOUT_MS)
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
              icon={saving ? <LoadingOutlined spin /> : (retryable || initTimedOut) ? <ReloadOutlined /> : <CheckOutlined />}
              loading={saving}
              disabled={canceling}
              onClick={initTimedOut ? reloadDrawio : handleSave}
            >
              {initTimedOut ? '重新加载' : retryable ? '重试保存' : '保存图示'}
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
            key={`${initialTitle || 'diagram'}-${initialXml?.length || 0}-${frameNonce}`}
            src={src}
            title="图示编辑器"
            className="memorica-drawio-frame"
          />
        )}
      </div>
    </Modal>
  )
}
