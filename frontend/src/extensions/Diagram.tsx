/* eslint-disable react-refresh/only-export-components */
import {
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  type NodeViewProps,
} from '@tiptap/react'
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FormOutlined,
  PartitionOutlined,
} from '@ant-design/icons'
import { safeDiagramDownloadName } from '../diagram/files'

export interface DiagramAttrs {
  xml: string
  svg?: string
  title?: string
  updatedAt?: string
}

export interface DiagramEditPayload {
  attrs: DiagramAttrs
  updateAttributes: (attrs: Partial<DiagramAttrs>) => void
}

export type DiagramAction = 'edit' | 'rename' | 'duplicate' | 'delete'

export interface DiagramActionPayload {
  action: DiagramAction
  attrs: DiagramAttrs
  updateAttributes: (attrs: Partial<DiagramAttrs>) => void
  duplicate: () => void
  remove: () => void
}

function previewSrc(svg?: string) {
  if (!svg) return ''
  const value = svg.trim()
  if (value.startsWith('data:image/')) return value
  if (value.startsWith('<svg')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`
  }
  return value
}

function DiagramView({ node, selected, updateAttributes, editor, getPos }: NodeViewProps) {
  const attrs = node.attrs as DiagramAttrs
  const src = previewSrc(attrs.svg)
  const title = attrs.title || '图示'
  const canEdit = editor.isEditable

  const dispatchAction = (action: DiagramAction) => {
    window.dispatchEvent(new CustomEvent<DiagramActionPayload>('memorica:diagram-action', {
      detail: {
        action,
        attrs,
        updateAttributes,
        duplicate: () => {
          const pos = typeof getPos === 'function' ? getPos() : undefined
          if (typeof pos !== 'number') return
          editor.chain().focus().insertContentAt(pos + node.nodeSize, {
            type: 'diagram',
            attrs: {
              ...attrs,
              title: `${title} 副本`,
              updatedAt: new Date().toISOString(),
            },
          }).run()
        },
        remove: () => {
          const pos = typeof getPos === 'function' ? getPos() : undefined
          if (typeof pos !== 'number') return
          editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
        },
      },
    }))
  }

  const downloadSvg = () => {
    if (!attrs.svg) return
    const link = document.createElement('a')
    let objectUrl = ''
    if (attrs.svg.trim().startsWith('data:image/')) {
      link.href = attrs.svg
    } else {
      objectUrl = URL.createObjectURL(new Blob([attrs.svg], { type: 'image/svg+xml;charset=utf-8' }))
      link.href = objectUrl
    }
    link.download = safeDiagramDownloadName(title)
    link.click()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }

  return (
    <NodeViewWrapper
      className={`memorica-diagram-node${selected ? ' selected' : ''}`}
      data-type="diagram"
      data-testid="memorica-diagram-node"
      contentEditable={false}
    >
      <div className="memorica-diagram-head">
        <span className="memorica-diagram-title">
          <PartitionOutlined style={{ fontSize: 15 }} />
          {title}
        </span>
        <div className="memorica-diagram-actions">
          {canEdit && (
            <>
              <button
                data-testid="memorica-diagram-action-edit"
                type="button"
                onClick={() => dispatchAction('edit')}
              >
                <EditOutlined style={{ fontSize: 13 }} />
                编辑
              </button>
              <button
                data-testid="memorica-diagram-action-rename"
                type="button"
                onClick={() => dispatchAction('rename')}
              >
                <FormOutlined style={{ fontSize: 13 }} />
                重命名
              </button>
              <button
                data-testid="memorica-diagram-action-duplicate"
                type="button"
                onClick={() => dispatchAction('duplicate')}
              >
                <CopyOutlined style={{ fontSize: 13 }} />
                复制
              </button>
              <button
                data-testid="memorica-diagram-action-delete"
                type="button"
                onClick={() => dispatchAction('delete')}
              >
                <DeleteOutlined style={{ fontSize: 13 }} />
                删除
              </button>
            </>
          )}
          <button
            data-testid="memorica-diagram-action-download"
            type="button"
            onClick={downloadSvg}
            disabled={!attrs.svg}
          >
            <DownloadOutlined style={{ fontSize: 13 }} />
            下载 SVG
          </button>
        </div>
      </div>
      <div className="memorica-diagram-canvas">
        {src ? (
          <img src={src} alt={title} />
        ) : (
          <div className="memorica-diagram-empty">
            <PartitionOutlined style={{ fontSize: 22 }} />
            <span>打开图示编辑器</span>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const Diagram = Node.create({
  name: 'diagram',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      xml: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-xml') || '',
        renderHTML: (attributes) => ({ 'data-xml': attributes.xml }),
      },
      svg: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-svg') || '',
        renderHTML: (attributes) => ({ 'data-svg': attributes.svg }),
      },
      title: {
        default: '图示',
        parseHTML: (element) => element.getAttribute('data-title') || '图示',
        renderHTML: (attributes) => ({ 'data-title': attributes.title }),
      },
      updatedAt: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-updated-at') || '',
        renderHTML: (attributes) => ({ 'data-updated-at': attributes.updatedAt }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="diagram"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'diagram', class: 'memorica-diagram-static' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramView)
  },
})
