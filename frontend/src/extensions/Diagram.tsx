/* eslint-disable react-refresh/only-export-components */
import {
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  type NodeViewProps,
} from '@tiptap/react'
import { Edit3, Workflow } from 'lucide-react'

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

function previewSrc(svg?: string) {
  if (!svg) return ''
  const value = svg.trim()
  if (value.startsWith('data:image/')) return value
  if (value.startsWith('<svg')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`
  }
  return value
}

function DiagramView({ node, selected, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as DiagramAttrs
  const src = previewSrc(attrs.svg)
  const title = attrs.title || '图示'

  return (
    <NodeViewWrapper
      className={`memorica-diagram-node${selected ? ' selected' : ''}`}
      data-type="diagram"
      contentEditable={false}
    >
      <div className="memorica-diagram-head">
        <span className="memorica-diagram-title">
          <Workflow size={15} />
          {title}
        </span>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent<DiagramEditPayload>('memorica:diagram-edit', {
              detail: { attrs, updateAttributes },
            }))
          }}
          className="memorica-diagram-edit"
        >
          <Edit3 size={14} />
          编辑
        </button>
      </div>
      <div className="memorica-diagram-canvas">
        {src ? (
          <img src={src} alt={title} />
        ) : (
          <div className="memorica-diagram-empty">
            <Workflow size={22} />
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
