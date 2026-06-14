import { useState } from 'react'
import { Editor } from '@tiptap/react'
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BgColorsOutlined,
  BlockOutlined,
  BoldOutlined,
  CheckSquareOutlined,
  CodeOutlined,
  FontSizeOutlined,
  HighlightOutlined,
  ItalicOutlined,
  LinkOutlined,
  MinusOutlined,
  OrderedListOutlined,
  PaperClipOutlined,
  PartitionOutlined,
  PictureOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  SubnodeOutlined,
  TableOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
  UploadOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'

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
  onCreateDiagram?: () => void
  onUploadImage?: () => void
  onUploadAttachment?: () => void
  uploading?: boolean
}

type RichTextChain = ReturnType<Editor['chain']> & {
  setColor: (color: string) => RichTextChain
  unsetColor: () => RichTextChain
  setFontFamily: (font: string) => RichTextChain
  unsetFontFamily: () => RichTextChain
  toggleSubscript: () => RichTextChain
  toggleSuperscript: () => RichTextChain
  setYoutubeVideo: (options: { src: string }) => RichTextChain
}

export default function Toolbar({ editor, onCreateDiagram, onUploadImage, onUploadAttachment, uploading }: ToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)

  if (!editor) return null

  const btnClass = (active: boolean) =>
    `p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
      active
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
    }`

  const richChain = () => editor.chain().focus() as unknown as RichTextChain

  const addImage = () => {
    const url = window.prompt('图片 URL:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
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
    if (url) richChain().setYoutubeVideo({ src: url }).run()
  }

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
    <div className="sticky top-12 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-[900px] mx-auto px-4 py-2">
        <div className="flex items-center gap-1 flex-wrap">
          {/* 撤销重做 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btnClass(false)} title="撤销"><UndoOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btnClass(false)} title="重做"><RedoOutlined style={{ fontSize: 16 }} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 基础格式 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="加粗"><BoldOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="斜体"><ItalicOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="下划线"><UnderlineOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="删除线"><StrikethroughOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btnClass(editor.isActive('highlight'))} title="高亮"><HighlightOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => editor.chain().focus().toggleCode().run()} className={btnClass(editor.isActive('code'))} title="代码"><CodeOutlined style={{ fontSize: 16 }} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 上标下标 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => richChain().toggleSubscript().run()} className={btnClass(editor.isActive('subscript'))} title="下标"><SubnodeOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => richChain().toggleSuperscript().run()} className={btnClass(editor.isActive('superscript'))} title="上标"><FontSizeOutlined style={{ fontSize: 16 }} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 颜色 */}
          <div className="relative mr-2">
            <button
              onClick={() => { setShowColorPicker(!showColorPicker); setShowFontPicker(false) }}
              className={btnClass(!!editor.getAttributes('textStyle').color)}
              title="文字颜色"
            >
              <BgColorsOutlined style={{ fontSize: 16 }} />
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
                  onClick={() => { richChain().unsetColor().run(); setShowColorPicker(false) }}
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
              <FontSizeOutlined style={{ fontSize: 16 }} />
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
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))} title="H1"><span className="text-[11px] font-semibold leading-none">H1</span></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="H2"><span className="text-[11px] font-semibold leading-none">H2</span></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))} title="H3"><span className="text-[11px] font-semibold leading-none">H3</span></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 列表 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="无序列表"><UnorderedListOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="有序列表"><OrderedListOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={btnClass(editor.isActive('taskList'))} title="任务列表"><CheckSquareOutlined style={{ fontSize: 16 }} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 对齐 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))} title="左对齐"><AlignLeftOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))} title="居中"><AlignCenterOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))} title="右对齐"><AlignRightOutlined style={{ fontSize: 16 }} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 插入 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="引用"><BlockOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnClass(false)} title="分隔线"><MinusOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={addLink} className={btnClass(editor.isActive('link'))} title="链接"><LinkOutlined style={{ fontSize: 16 }} /></button>
            <button onClick={addImage} className={btnClass(false)} title="图片 URL"><PictureOutlined style={{ fontSize: 16 }} /></button>
            {onUploadImage && (
              <button onClick={onUploadImage} className={btnClass(false)} title={uploading ? '上传中' : '上传图片'} disabled={uploading}>
                <UploadOutlined style={{ fontSize: 16 }} />
              </button>
            )}
            {onUploadAttachment && (
              <button onClick={onUploadAttachment} className={btnClass(false)} title={uploading ? '上传中' : '上传附件'} disabled={uploading}>
                <PaperClipOutlined style={{ fontSize: 16 }} />
              </button>
            )}
            <button onClick={addTable} className={btnClass(editor.isActive('table'))} title="表格"><TableOutlined style={{ fontSize: 16 }} /></button>
            {onCreateDiagram && (
              <button onClick={onCreateDiagram} className={btnClass(false)} title="图示"><PartitionOutlined style={{ fontSize: 16 }} /></button>
            )}
            <button onClick={addYoutube} className={btnClass(false)} title="YouTube"><VideoCameraOutlined style={{ fontSize: 16 }} /></button>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

        </div>
      </div>
    </div>
  )
}
