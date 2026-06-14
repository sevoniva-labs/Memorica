import { Editor } from '@tiptap/react'
import {
  BlockOutlined,
  CheckSquareOutlined,
  CodeOutlined,
  FontSizeOutlined,
  FunctionOutlined,
  MinusOutlined,
  OrderedListOutlined,
  PaperClipOutlined,
  PartitionOutlined,
  PictureOutlined,
  SmileOutlined,
  TableOutlined,
  UnorderedListOutlined,
  YoutubeOutlined,
} from '@ant-design/icons'
import { useState, useEffect, useCallback, useRef, useMemo, type ElementType } from 'react'
import { aiActionLabels, aiActionIcons, type AIAction } from '../ai/aiActions'

interface SlashItem {
  title: string
  icon: ElementType
  category: string
  command: (editor: Editor) => void
}

interface AIItem {
  title: string
  key: AIAction
  icon: string
}

type MenuItem = SlashItem | AIItem

type EmbedChain = ReturnType<Editor['chain']> & {
  setYoutubeVideo: (options: { src: string }) => EmbedChain
}

function embedChain(editor: Editor) {
  return editor.chain().focus() as unknown as EmbedChain
}

function createBlockItems(
  onCreateDiagram?: () => void,
  onUploadImage?: () => void,
  onUploadAttachment?: () => void
): SlashItem[] {
  return [
  { title: '文本', icon: FontSizeOutlined, category: '基础', command: (editor) => editor.chain().focus().setParagraph().run() },
  { title: '标题 1', icon: FontSizeOutlined, category: '基础', command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: '标题 2', icon: FontSizeOutlined, category: '基础', command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: '标题 3', icon: FontSizeOutlined, category: '基础', command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { title: '无序列表', icon: UnorderedListOutlined, category: '列表', command: (editor) => editor.chain().focus().toggleBulletList().run() },
  { title: '有序列表', icon: OrderedListOutlined, category: '列表', command: (editor) => editor.chain().focus().toggleOrderedList().run() },
  { title: '任务列表', icon: CheckSquareOutlined, category: '列表', command: (editor) => editor.chain().focus().toggleTaskList().run() },
  { title: '引用', icon: BlockOutlined, category: '媒体', command: (editor) => editor.chain().focus().toggleBlockquote().run() },
  { title: '代码块', icon: CodeOutlined, category: '媒体', command: (editor) => editor.chain().focus().toggleCodeBlock().run() },
  { title: '分隔线', icon: MinusOutlined, category: '媒体', command: (editor) => editor.chain().focus().setHorizontalRule().run() },
  { title: '表格', icon: TableOutlined, category: '媒体', command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run() },
  { title: '图片', icon: PictureOutlined, category: '媒体', command: (editor) => {
    const url = window.prompt('图片 URL:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }},
  ...(onUploadImage ? [{
    title: '上传图片',
    icon: PictureOutlined,
    category: '媒体',
    command: () => onUploadImage(),
  }] : []),
  ...(onUploadAttachment ? [{
    title: '附件',
    icon: PaperClipOutlined,
    category: '媒体',
    command: () => onUploadAttachment(),
  }] : []),
  { title: 'YouTube', icon: YoutubeOutlined, category: '嵌入', command: (editor) => {
    const url = window.prompt('YouTube URL:')
    if (url) embedChain(editor).setYoutubeVideo({ src: url }).run()
  }},
  ...(onCreateDiagram ? [{
    title: '图示',
    icon: PartitionOutlined,
    category: '嵌入',
    command: () => onCreateDiagram(),
  }] : []),
  { title: '数学公式', icon: FunctionOutlined, category: '嵌入', command: (editor) => {
    const formula = window.prompt('输入 LaTeX 公式（行内用 $...$，块级用 $$...$$）:')
    if (formula) {
      if (formula.startsWith('$$') && formula.endsWith('$$')) {
        editor.chain().focus().insertContent({ type: 'mathBlock', attrs: { text: formula.slice(2, -2).trim() } }).run()
      } else {
        const text = formula.replace(/^\$|\$$/g, '').trim()
        editor.chain().focus().insertContent({ type: 'mathInline', attrs: { text } }).run()
      }
    }
  }},
  { title: '表情符号', icon: SmileOutlined, category: '嵌入', command: (editor) => {
    editor.chain().focus().insertContent(':smile:').run()
  }},
  ]
}

interface Props {
  editor: Editor | null
  onAskAI?: (action: AIAction) => void
  onCreateDiagram?: () => void
  onUploadImage?: () => void
  onUploadAttachment?: () => void
}

export default function SlashMenu({ editor, onAskAI, onCreateDiagram, onUploadImage, onUploadAttachment }: Props) {
  const [show, setShow] = useState(false)
  const [selected, setSelected] = useState(0)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const showRef = useRef(show)
  const menuRef = useRef<HTMLDivElement>(null)
  const blockItems = useMemo(
    () => createBlockItems(onCreateDiagram, onUploadImage, onUploadAttachment),
    [onCreateDiagram, onUploadAttachment, onUploadImage]
  )

  // 保持 ref 与 state 同步
  useEffect(() => {
    showRef.current = show
  }, [show])

  const aiItems = useMemo<AIItem[]>(() => {
    if (!onAskAI) return []
    return Object.entries(aiActionLabels)
      .filter(([key]) => key !== 'custom')
      .map(([key, label]) => ({
        title: label,
        key: key as AIAction,
        icon: aiActionIcons[key as AIAction],
      }))
  }, [onAskAI])

  const filteredBlocks = useMemo(() => {
    if (!query) return blockItems
    return blockItems.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
  }, [blockItems, query])

  const filteredAI = useMemo(() => {
    if (!query) return aiItems
    return aiItems.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
  }, [aiItems, query])

  const allItems = useMemo<MenuItem[]>(
    () => [...filteredBlocks, ...filteredAI],
    [filteredBlocks, filteredAI]
  )

  const updatePosition = useCallback(() => {
    if (!editor) return
    const { from } = editor.state.selection
    const coords = editor.view.coordsAtPos(from)
    const editorRect = editor.view.dom.getBoundingClientRect()
    setPos({
      top: coords.bottom - editorRect.top + 8,
      left: coords.left - editorRect.left,
    })
  }, [editor])

  // 监听编辑器内容变化，检测 / 触发
  useEffect(() => {
    if (!editor) return

    const handler = () => {
      const { from } = editor.state.selection
      // 获取光标前一个字符
      const prevChar = from > 0 ? editor.state.doc.textBetween(from - 1, from) : ''

      if (prevChar === '/') {
        // 使用 resolve 获取当前块的开始位置，更准确地判断 / 是否在块开头或空格后
        try {
          const $pos = editor.state.doc.resolve(from - 1)
          const blockStart = $pos.start()
          const beforeSlash = editor.state.doc.textBetween(blockStart, from - 1)
          const isValidTrigger = beforeSlash === '' || beforeSlash.endsWith(' ')

          if (isValidTrigger) {
            setShow(true)
            setQuery('')
            setSelected(0)
            updatePosition()
          }
        } catch {
          // 如果 resolve 失败（极少数边界情况），回退到简单判断
          const beforeSlash = from > 1 ? editor.state.doc.textBetween(Math.max(0, from - 10), from - 1) : ''
          const isValidTrigger = beforeSlash === '' || beforeSlash.endsWith(' ') || beforeSlash.endsWith('\n')
          if (isValidTrigger) {
            setShow(true)
            setQuery('')
            setSelected(0)
            updatePosition()
          }
        }
        return
      }

      // 如果菜单正在显示，更新 query 或关闭
      if (showRef.current) {
        const current = editor.state.doc.textBetween(Math.max(0, from - 50), from, '\n')
        const lastSlashIndex = current.lastIndexOf('/')

        if (lastSlashIndex === -1) {
          setShow(false)
          setQuery('')
        } else {
          const q = current.slice(lastSlashIndex + 1)
          // 如果 query 中包含空格或换行，关闭菜单
          if (/[\s\n]/.test(q)) {
            setShow(false)
            setQuery('')
          } else {
            setQuery(q)
            setSelected(0)
            updatePosition()
          }
        }
      }
    }

    editor.on('update', handler)
    editor.on('selectionUpdate', handler)

    return () => {
      editor.off('update', handler)
      editor.off('selectionUpdate', handler)
    }
  }, [editor, updatePosition])

  // 键盘导航
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showRef.current) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((s) => (s + 1) % allItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((s) => (s - 1 + allItems.length) % allItems.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = allItems[selected]
        if (!item) return

        if ('command' in item) {
          item.command(editor)
        } else if ('key' in item && onAskAI) {
          onAskAI(item.key)
        }
        setShow(false)
        setQuery('')
        setSelected(0)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShow(false)
        setQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor, allItems, selected, onAskAI])

  if (!show || !editor || allItems.length === 0) return null

  // 按分类分组显示
  const categories = Array.from(new Set(filteredBlocks.map((i) => i.category)))

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-64 max-h-80 overflow-y-auto"
      style={{ top: pos.top, left: pos.left }}
    >
      {categories.map((cat) => {
        const catItems = filteredBlocks.filter((i) => i.category === cat)
        if (catItems.length === 0) return null
        return (
          <div key={cat}>
            <div className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider">{cat}</div>
            {catItems.map((item) => {
              const globalIdx = allItems.findIndex((candidate) => candidate.title === item.title)
              const Icon = item.icon
              return (
                <button
                  key={item.title}
                  onClick={() => {
                    item.command(editor)
                    setShow(false)
                    setQuery('')
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    globalIdx === selected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="text-gray-400" style={{ fontSize: 18 }} />
                  <span className="text-sm">{item.title}</span>
                </button>
              )
            })}
          </div>
        )
      })}

      {filteredAI.length > 0 && onAskAI && (
        <>
          <div className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider border-t border-gray-100 mt-1">AI 助手</div>
          {filteredAI.map((item, idx) => {
            const globalIdx = filteredBlocks.length + idx
            return (
              <button
                key={item.key}
                onClick={() => {
                  onAskAI(item.key)
                  setShow(false)
                  setQuery('')
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  globalIdx === selected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg w-[18px] text-center">{item.icon}</span>
                <span className="text-sm">{item.title}</span>
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}
