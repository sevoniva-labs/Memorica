/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
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
import { Button, Tooltip } from 'antd'
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

function staticAttr(attributes: Record<string, unknown>, name: string, fallback = '') {
  const value = attributes[name]
  return typeof value === 'string' && value.trim() ? value : fallback
}

function DiagramView({ node, selected, updateAttributes, editor, getPos }: NodeViewProps) {
  const attrs = node.attrs as DiagramAttrs
  const src = previewSrc(attrs.svg)
  const title = attrs.title || '图示'
  const canEdit = editor.isEditable
  const hasXml = Boolean(attrs.xml?.trim())

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

  const renderActionButton = (
    label: string,
    icon: ReactNode,
    testId: string,
    onClick: () => void,
    disabled = false,
    danger = false
  ) => (
    <Tooltip title={label}>
      <Button
        className="memorica-diagram-action"
        danger={danger}
        data-testid={testId}
        disabled={disabled}
        icon={icon}
        onClick={onClick}
        size="small"
        title={label}
      >
        {label}
      </Button>
    </Tooltip>
  )

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
              {renderActionButton('编辑', <EditOutlined style={{ fontSize: 13 }} />, 'memorica-diagram-action-edit', () => dispatchAction('edit'))}
              {renderActionButton('重命名', <FormOutlined style={{ fontSize: 13 }} />, 'memorica-diagram-action-rename', () => dispatchAction('rename'))}
              {renderActionButton('复制', <CopyOutlined style={{ fontSize: 13 }} />, 'memorica-diagram-action-duplicate', () => dispatchAction('duplicate'))}
              {renderActionButton('删除', <DeleteOutlined style={{ fontSize: 13 }} />, 'memorica-diagram-action-delete', () => dispatchAction('delete'), false, true)}
            </>
          )}
          {renderActionButton('下载 SVG', <DownloadOutlined style={{ fontSize: 13 }} />, 'memorica-diagram-action-download', downloadSvg, !attrs.svg)}
        </div>
      </div>
      <div className="memorica-diagram-canvas">
        {src ? (
          <img src={src} alt={title} />
        ) : (
          <div className="memorica-diagram-empty" data-testid="memorica-diagram-preview-fallback">
            <PartitionOutlined style={{ fontSize: 22 }} />
            <span className="memorica-diagram-empty-copy">
              <strong>预览不可用</strong>
              <em>
                {hasXml
                  ? (canEdit ? 'XML 已保留，可重新编辑生成预览' : 'XML 已保留，请联系可编辑成员重新生成预览')
                  : '图示数据为空'}
              </em>
            </span>
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
    const title = staticAttr(HTMLAttributes, 'data-title', '图示')
    const xml = staticAttr(HTMLAttributes, 'data-xml')
    const svg = staticAttr(HTMLAttributes, 'data-svg')
    const src = previewSrc(svg)

    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'diagram', class: 'memorica-diagram-static' }),
      [
        'div',
        { class: 'memorica-diagram-head' },
        [
          'span',
          { class: 'memorica-diagram-title' },
          ['span', { class: 'memorica-diagram-static-icon', 'aria-hidden': 'true' }, '图示'],
          title,
        ],
        ['span', { class: 'memorica-diagram-static-badge' }, '历史快照'],
      ],
      [
        'div',
        { class: 'memorica-diagram-canvas' },
        src
          ? ['img', { src, alt: title }]
          : [
              'div',
              { class: 'memorica-diagram-empty' },
              ['span', { class: 'memorica-diagram-empty-copy' },
                ['strong', {}, '预览不可用'],
                ['em', {}, xml ? 'XML 已保留，可在编辑器中重新生成预览' : '图示数据为空'],
              ],
            ],
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramView)
  },
})
