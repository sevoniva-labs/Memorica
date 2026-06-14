/* eslint-disable react-refresh/only-export-components */
import {
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  type NodeViewProps,
} from '@tiptap/react'
import { DownloadOutlined, FileTextOutlined, LoadingOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { apiErrorMessage, getFileUrl } from '../api/client'

export interface AttachmentAttrs {
  objectName: string
  url?: string
  name?: string
  sizeBytes?: number
  contentType?: string
  uploadedAt?: string
}

function formatSize(size?: number) {
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function staticAttr(attributes: Record<string, unknown>, name: string, fallback = '') {
  const value = attributes[name]
  return typeof value === 'string' && value.trim() ? value : fallback
}

type AttachmentStatus = {
  state: 'error'
  text: string
}

function formatOpenFailureMessage(message: string) {
  if (message.includes('权限') || message.includes('无权')) {
    return `权限不足：${message}`
  }
  return `打开失败：${message}`
}

function AttachmentView({ node }: NodeViewProps) {
  const attrs = node.attrs as AttachmentAttrs
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState(attrs.url || '')
  const [status, setStatus] = useState<AttachmentStatus | null>(null)
  const title = attrs.name || attrs.objectName || '附件'
  const meta = [attrs.contentType, formatSize(attrs.sizeBytes)].filter(Boolean).join(' · ')

  const openFile = async () => {
    if (!attrs.objectName) {
      setStatus({ state: 'error', text: '打开失败：附件信息不完整' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const fresh = await getFileUrl(attrs.objectName)
      const nextUrl = fresh.url || url
      setUrl(nextUrl)
      if (nextUrl) {
        window.open(nextUrl, '_blank', 'noopener,noreferrer')
      } else {
        setStatus({ state: 'error', text: '打开失败：文件链接为空' })
      }
    } catch (error) {
      const message = apiErrorMessage(error, '附件打开失败，请稍后重试')
      setStatus({ state: 'error', text: formatOpenFailureMessage(message) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <NodeViewWrapper className="memorica-attachment-node" data-type="attachment" contentEditable={false}>
      <div className="memorica-attachment-icon">
        <FileTextOutlined style={{ fontSize: 18 }} />
      </div>
      <div className="memorica-attachment-copy">
        <div className="memorica-attachment-title">{title}</div>
        {meta && <div className="memorica-attachment-meta">{meta}</div>}
        {status && (
          <div
            className="memorica-attachment-status"
            data-state={status.state}
            data-testid="memorica-attachment-status"
            aria-live="polite"
          >
            {status.text}
          </div>
        )}
      </div>
      <button
        type="button"
        className="memorica-attachment-action"
        onClick={openFile}
        disabled={loading}
        data-testid="memorica-attachment-open"
      >
        {loading ? <LoadingOutlined spin style={{ fontSize: 15 }} /> : <DownloadOutlined style={{ fontSize: 15 }} />}
        <span>打开</span>
      </button>
    </NodeViewWrapper>
  )
}

export const Attachment = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      objectName: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-object-name') || '',
        renderHTML: (attributes) => ({ 'data-object-name': attributes.objectName }),
      },
      url: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-url') || '',
        renderHTML: (attributes) => ({ 'data-url': attributes.url }),
      },
      name: {
        default: '附件',
        parseHTML: (element) => element.getAttribute('data-name') || '附件',
        renderHTML: (attributes) => ({ 'data-name': attributes.name }),
      },
      sizeBytes: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute('data-size-bytes') || 0),
        renderHTML: (attributes) => ({ 'data-size-bytes': attributes.sizeBytes }),
      },
      contentType: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-content-type') || '',
        renderHTML: (attributes) => ({ 'data-content-type': attributes.contentType }),
      },
      uploadedAt: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-uploaded-at') || '',
        renderHTML: (attributes) => ({ 'data-uploaded-at': attributes.uploadedAt }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="attachment"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const title = staticAttr(HTMLAttributes, 'data-name', '附件')
    const contentType = staticAttr(HTMLAttributes, 'data-content-type')
    const sizeBytes = Number(HTMLAttributes['data-size-bytes'] || 0)
    const meta = [contentType, formatSize(sizeBytes)].filter(Boolean).join(' · ') || '历史版本附件'

    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'attachment', class: 'memorica-attachment-static' }),
      ['div', { class: 'memorica-attachment-icon', 'aria-hidden': 'true' }, 'FILE'],
      [
        'div',
        { class: 'memorica-attachment-copy' },
        ['div', { class: 'memorica-attachment-title' }, title],
        ['div', { class: 'memorica-attachment-meta' }, meta],
      ],
      ['span', { class: 'memorica-attachment-static-badge' }, '历史快照'],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentView)
  },
})
