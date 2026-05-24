import { useState } from 'react'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  Bold, Italic, Underline, Strikethrough,
  Code, Link, Highlighter, AlignLeft, AlignCenter, AlignRight,
  Subscript, Superscript,
  Palette, Type,
  Sparkles,
} from 'lucide-react'

const colors = [
  '#000000', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#a855f7', '#ec4899',
  '#6b7280', '#9ca3af',
]

const fonts = [
  { label: '默认', value: '' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
]

interface Props {
  editor: Editor | null
  onAskAI?: () => void
}

type RichTextChain = ReturnType<Editor['chain']> & {
  setColor: (color: string) => RichTextChain
  unsetColor: () => RichTextChain
  setFontFamily: (font: string) => RichTextChain
  unsetFontFamily: () => RichTextChain
  toggleSubscript: () => RichTextChain
  toggleSuperscript: () => RichTextChain
}

export default function BubbleMenuBar({ editor, onAskAI }: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)

  if (!editor) return null

  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${
      active ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`

  const richChain = () => editor.chain().focus() as unknown as RichTextChain

  const setFontColor = (color: string) => {
    richChain().setColor(color).run()
    setShowColorPicker(false)
  }

  const setFontFamily = (font: string) => {
    if (font) {
      richChain().setFontFamily(font).run()
    } else {
      richChain().unsetFontFamily().run()
    }
    setShowFontPicker(false)
  }

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={100}
      className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-1.5 relative"
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive('bold'))}
        title="加粗"
      >
        <Bold size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive('italic'))}
        title="斜体"
      >
        <Italic size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btn(editor.isActive('underline'))}
        title="下划线"
      >
        <Underline size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive('strike'))}
        title="删除线"
      >
        <Strikethrough size={14} />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={btn(editor.isActive('code'))}
        title="代码"
      >
        <Code size={14} />
      </button>
      <button
        onClick={() => {
          const url = window.prompt('链接 URL:')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }}
        className={btn(editor.isActive('link'))}
        title="链接"
      >
        <Link size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={btn(editor.isActive('highlight'))}
        title="高亮"
      >
        <Highlighter size={14} />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button
        onClick={() => richChain().toggleSubscript().run()}
        className={btn(editor.isActive('subscript'))}
        title="下标"
      >
        <Subscript size={14} />
      </button>
      <button
        onClick={() => richChain().toggleSuperscript().run()}
        className={btn(editor.isActive('superscript'))}
        title="上标"
      >
        <Superscript size={14} />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      {/* 颜色 */}
      <div className="relative">
        <button
          onClick={() => { setShowColorPicker(!showColorPicker); setShowFontPicker(false) }}
          className={btn(!!editor.getAttributes('textStyle').color)}
          title="文字颜色"
        >
          <Palette size={14} />
          <span
            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-[2px] rounded-full"
            style={{ backgroundColor: editor.getAttributes('textStyle').color || 'transparent' }}
          />
        </button>
        {showColorPicker && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-xl grid grid-cols-5 gap-1 z-50">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setFontColor(c)}
                className="w-5 h-5 rounded-full border border-gray-200 hover:scale-110 transition"
                style={{ backgroundColor: c }}
              />
            ))}
            <button
              onClick={() => { richChain().unsetColor().run(); setShowColorPicker(false) }}
              className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-[10px] text-gray-400"
            >
              ×
            </button>
          </div>
        )}
      </div>
      {/* 字体 */}
      <div className="relative">
        <button
          onClick={() => { setShowFontPicker(!showFontPicker); setShowColorPicker(false) }}
          className={btn(false)}
          title="字体"
        >
          <Type size={14} />
        </button>
        {showFontPicker && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 py-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[120px]">
            {fonts.map((f) => (
              <button
                key={f.label}
                onClick={() => setFontFamily(f.value)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition"
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={btn(editor.isActive({ textAlign: 'left' }))}
        title="左对齐"
      >
        <AlignLeft size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={btn(editor.isActive({ textAlign: 'center' }))}
        title="居中"
      >
        <AlignCenter size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={btn(editor.isActive({ textAlign: 'right' }))}
        title="右对齐"
      >
        <AlignRight size={14} />
      </button>
      {/* AI 按钮 */}
      {onAskAI && (
        <>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button
            onClick={onAskAI}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            title="Ask AI"
          >
            <Sparkles size={14} />
            AI
          </button>
        </>
      )}
    </BubbleMenu>
  )
}
