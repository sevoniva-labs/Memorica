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
import { getFileUrl } from '../api/client'

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

function AttachmentView({ node }: NodeViewProps) {
  const attrs = node.attrs as AttachmentAttrs
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState(attrs.url || '')
  const title = attrs.name || attrs.objectName || '附件'
  const meta = [attrs.contentType, formatSize(attrs.sizeBytes)].filter(Boolean).join(' · ')

  const openFile = async () => {
    if (!attrs.objectName) return
    setLoading(true)
    try {
      const fresh = await getFileUrl(attrs.objectName)
      const nextUrl = fresh.url || url
      setUrl(nextUrl)
      if (nextUrl) {
        window.open(nextUrl, '_blank', 'noopener,noreferrer')
      }
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
      </div>
      <button type="button" className="memorica-attachment-action" onClick={openFile} disabled={loading}>
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
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'attachment', class: 'memorica-attachment-static' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentView)
  },
})
