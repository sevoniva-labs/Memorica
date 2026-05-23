import { useState, useRef } from 'react'
import { Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks,
  Quote, Code, Link, Image,
  Table, Undo, Redo,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Minus,
  Subscript, Superscript,
  Palette, Type,
  Focus, Upload,
} from 'lucide-react'
import { uploadFile } from '../api/client'

const colors = [
  '#000000', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#a855f7', '#ec4899',
  '#6b7280', '#9ca3af',
]

const fonts = [
  { label: '默认', value: '' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'monospace' },
]

interface ToolbarProps {
  editor: Editor | null
}

export default function Toolbar({ editor }: ToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)

  if (!editor) return null

  const btnClass = (active: boolean) =>
    `p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
      active
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
    }`

  const fileInputRef = useRef<HTMLInputElement>(null)

  const addImage = () => {
    const url = window.prompt('图片 URL:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    try {
      const res = await uploadFile(file)
      editor.chain().focus().setImage({ src: res.url }).run()
    } catch {
      alert('图片上传失败')
    }
    e.target.value = ''
  }

  const addLink = () => {
    const url = window.prompt('链接 URL:')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()
  }

  const addYoutube = () => {
    const url = window.prompt('YouTube URL:')
    if (url) (editor.chain().focus() as any).setYoutubeVideo({ src: url }).run()
  }

  const setFontColor = (color: string) => {
    ;(editor.chain().focus() as any).setColor(color).run()
    setShowColorPicker(false)
  }

  const setFontFamily = (font: string) => {
    if (font) {
      ;(editor.chain().focus() as any).setFontFamily(font).run()
    } else {
      ;(editor.chain().focus() as any).unsetFontFamily().run()
    }
    setShowFontPicker(false)
  }

  return (
    <div className="sticky top-12 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-[900px] mx-auto px-4 py-2">
        <div className="flex items-center gap-1 flex-wrap">
          {/* 撤销重做 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btnClass(false)} title="撤销"><Undo size={16} /></button>
            <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btnClass(false)} title="重做"><Redo size={16} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 基础格式 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="加粗"><Bold size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="斜体"><Italic size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="下划线"><Underline size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="删除线"><Strikethrough size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btnClass(editor.isActive('highlight'))} title="高亮"><Highlighter size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleCode().run()} className={btnClass(editor.isActive('code'))} title="代码"><Code size={16} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 上标下标 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => (editor.chain().focus() as any).toggleSubscript().run()} className={btnClass(editor.isActive('subscript'))} title="下标"><Subscript size={16} /></button>
            <button onClick={() => (editor.chain().focus() as any).toggleSuperscript().run()} className={btnClass(editor.isActive('superscript'))} title="上标"><Superscript size={16} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 颜色 */}
          <div className="relative mr-2">
            <button
              onClick={() => { setShowColorPicker(!showColorPicker); setShowFontPicker(false) }}
              className={btnClass(!!editor.getAttributes('textStyle').color)}
              title="文字颜色"
            >
              <Palette size={16} />
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full"
                style={{ backgroundColor: editor.getAttributes('textStyle').color || 'transparent' }}
              />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-xl grid grid-cols-5 gap-1 z-50">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFontColor(c)}
                    className="w-5 h-5 rounded-full border border-gray-200 hover:scale-110 transition"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <button
                  onClick={() => { (editor.chain().focus() as any).unsetColor().run(); setShowColorPicker(false) }}
                  className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-[10px] text-gray-400 hover:text-gray-600"
                  title="清除颜色"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* 字体 */}
          <div className="relative mr-2">
            <button
              onClick={() => { setShowFontPicker(!showFontPicker); setShowColorPicker(false) }}
              className={btnClass(false)}
              title="字体"
            >
              <Type size={16} />
            </button>
            {showFontPicker && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[140px]">
                {fonts.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setFontFamily(f.value)}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    style={{ fontFamily: f.value || undefined }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 标题 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))} title="H1"><Heading1 size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="H2"><Heading2 size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))} title="H3"><Heading3 size={16} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 列表 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="无序列表"><List size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="有序列表"><ListOrdered size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={btnClass(editor.isActive('taskList'))} title="任务列表"><ListChecks size={16} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 对齐 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))} title="左对齐"><AlignLeft size={16} /></button>
            <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))} title="居中"><AlignCenter size={16} /></button>
            <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))} title="右对齐"><AlignRight size={16} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 插入 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="引用"><Quote size={16} /></button>
            <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnClass(false)} title="分隔线"><Minus size={16} /></button>
            <button onClick={addLink} className={btnClass(editor.isActive('link'))} title="链接"><Link size={16} /></button>
            <button onClick={addImage} className={btnClass(false)} title="图片 URL"><Image size={16} /></button>
            <button onClick={() => fileInputRef.current?.click()} className={btnClass(false)} title="上传图片"><Upload size={16} /></button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <button onClick={addTable} className={btnClass(editor.isActive('table'))} title="表格"><Table size={16} /></button>
            <button onClick={addYoutube} className={btnClass(false)} title="YouTube"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 专注模式 */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => alert('专注模式已启用：当前段落会自动高亮，其他段落会淡化显示')}
              className={btnClass(false)}
              title="专注模式"
            >
              <Focus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
