/* eslint-disable react-refresh/only-export-components */
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Image } from '@tiptap/extension-image'
import { ImageIcon, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { getFileUrl } from '../api/client'

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

  const refresh = async () => {
    if (!attrs.objectName || triedRefreshRef.current) return
    triedRefreshRef.current = true
    setLoading(true)
    try {
      const fresh = await getFileUrl(attrs.objectName)
      if (fresh.url) setSrc(fresh.url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <NodeViewWrapper className="memorica-document-image" data-type="document-image" contentEditable={false}>
      {src ? (
        <img src={src} alt={attrs.alt || attrs.title || '图片'} title={attrs.title} onError={refresh} />
      ) : (
        <div className="memorica-document-image-empty">
          {loading ? <Loader2 size={18} className="memorica-spin-icon" /> : <ImageIcon size={18} />}
          <span>图片加载失败</span>
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
