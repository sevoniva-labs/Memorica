/* eslint-disable react-refresh/only-export-components */
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Image } from '@tiptap/extension-image'
import { LoadingOutlined, PictureOutlined } from '@ant-design/icons'
import { useRef, useState } from 'react'
import { apiErrorMessage, getFileUrl } from '../api/client'

function imageFailureStatusText(message: string) {
  return message.includes('权限') || message.includes('无权')
    ? `权限不足：${message}`
    : `图片加载失败：${message}`
}

function DocumentImageView({ node }: NodeViewProps) {
  const attrs = node.attrs as {
    src?: string
    alt?: string
    title?: string
    objectName?: string
  }
  const triedRefreshRef = useRef(false)
  const [src, setSrc] = useState(attrs.src || '')
  const [loading, setLoading] = useState(false)
  const [issue, setIssue] = useState('')

  const refresh = async () => {
    if (!attrs.objectName || triedRefreshRef.current) return
    triedRefreshRef.current = true
    setLoading(true)
    try {
      const fresh = await getFileUrl(attrs.objectName)
      if (fresh.url) {
        setIssue('')
        setSrc(fresh.url)
      }
    } catch (error) {
      const message = apiErrorMessage(error, '图片加载失败，请稍后重试')
      setIssue(imageFailureStatusText(message))
      setSrc('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <NodeViewWrapper
      className="memorica-document-image"
      data-type="document-image"
      data-testid="memorica-document-image-node"
      contentEditable={false}
    >
      {src ? (
        <img src={src} alt={attrs.alt || attrs.title || '图片'} title={attrs.title} onError={refresh} />
      ) : (
        <div className="memorica-document-image-empty">
          {loading ? <LoadingOutlined spin style={{ fontSize: 18 }} /> : <PictureOutlined style={{ fontSize: 18 }} />}
          <span data-testid="memorica-document-image-status">{issue || '图片加载失败'}</span>
        </div>
      )}
    </NodeViewWrapper>
  )
}

export const DocumentImage = Image.extend({
  addAttributes() {
    return {
      ...(this.parent?.() || {}),
      objectName: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-object-name') || '',
        renderHTML: (attributes) => ({ 'data-object-name': attributes.objectName }),
      },
      contentType: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-content-type') || '',
        renderHTML: (attributes) => ({ 'data-content-type': attributes.contentType }),
      },
      sizeBytes: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute('data-size-bytes') || 0),
        renderHTML: (attributes) => ({ 'data-size-bytes': attributes.sizeBytes }),
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(DocumentImageView)
  },
})
