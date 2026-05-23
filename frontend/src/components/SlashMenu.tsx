import { Editor } from '@tiptap/react'
import {
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks,
  Quote, Code, Image, Table,
  Minus, Type, Video, Sigma, Smile,
} from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { aiActionLabels, aiActionIcons, type AIAction } from '../ai/mockAI'

interface SlashItem {
  title: string
  icon: React.ElementType
  category: string
  command: (editor: Editor) => void
}

const blockItems: SlashItem[] = [
  { title: '文本', icon: Type, category: '基础', command: (editor) => editor.chain().focus().setParagraph().run() },
  { title: '标题 1', icon: Heading1, category: '基础', command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: '标题 2', icon: Heading2, category: '基础', command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: '标题 3', icon: Heading3, category: '基础', command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { title: '无序列表', icon: List, category: '列表', command: (editor) => editor.chain().focus().toggleBulletList().run() },
  { title: '有序列表', icon: ListOrdered, category: '列表', command: (editor) => editor.chain().focus().toggleOrderedList().run() },
  { title: '任务列表', icon: ListChecks, category: '列表', command: (editor) => editor.chain().focus().toggleTaskList().run() },
  { title: '引用', icon: Quote, category: '媒体', command: (editor) => editor.chain().focus().toggleBlockquote().run() },
  { title: '代码块', icon: Code, category: '媒体', command: (editor) => editor.chain().focus().toggleCodeBlock().run() },
  { title: '分隔线', icon: Minus, category: '媒体', command: (editor) => editor.chain().focus().setHorizontalRule().run() },
  { title: '表格', icon: Table, category: '媒体', command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run() },
  { title: '图片', icon: Image, category: '媒体', command: (editor) => {
    const url = window.prompt('图片 URL:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }},
  { title: 'YouTube', icon: Video, category: '嵌入', command: (editor) => {
    const url = window.prompt('YouTube URL:')
    if (url) (editor.chain().focus() as any).setYoutubeVideo({ src: url }).run()
  }},
  { title: '数学公式', icon: Sigma, category: '嵌入', command: (editor) => {
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
  { title: '表情符号', icon: Smile, category: '嵌入', command: (editor) => {
    editor.chain().focus().insertContent(':smile:').run()
  }},
]

interface Props {
  editor: Editor | null
  onAskAI?: (action: AIAction) => void
}

export default function SlashMenu({ editor, onAskAI }: Props) {
  const [show, setShow] = useState(false)
  const [selected, setSelected] = useState(0)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const showRef = useRef(show)
  const menuRef = useRef<HTMLDivElement>(null)

  // 保持 ref 与 state 同步
  useEffect(() => {
    showRef.current = show
  }, [show])

  const aiItems = onAskAI
    ? Object.entries(aiActionLabels)
        .filter(([key]) => key !== 'custom')
        .map(([key, label]) => ({
          title: label,
          key: key as AIAction,
          icon: aiActionIcons[key as AIAction],
        }))
    : []

  const filteredBlocks = query
    ? blockItems.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
    : blockItems

  const filteredAI = query
    ? aiItems.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
    : aiItems

  const allItems = [...filteredBlocks, ...filteredAI]

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
          ;(item as SlashItem).command(editor)
        } else if ('key' in item && onAskAI) {
          onAskAI((item as { key: AIAction }).key)
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
              const globalIdx = allItems.indexOf(item as any)
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
                  <Icon size={18} className="text-gray-400" />
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
