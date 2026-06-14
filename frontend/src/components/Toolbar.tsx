import { useState, type ReactNode } from 'react'
import { Editor } from '@tiptap/react'
import { Button, Dropdown, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
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

  const richChain = () => editor.chain().focus() as unknown as RichTextChain
  const activeFont = editor.getAttributes('textStyle').fontFamily as string | undefined
  const activeColor = editor.getAttributes('textStyle').color as string | undefined

  const buttonClass = (active: boolean, extra = '') =>
    `memorica-editor-toolbar-button ${active ? 'memorica-editor-toolbar-button-active' : ''} ${extra}`.trim()

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

  const renderToolbarButton = (
    title: string,
    icon: ReactNode,
    onClick: () => void,
    options: { active?: boolean; disabled?: boolean; className?: string } = {},
  ) => (
    <Tooltip title={title}>
      <Button
        aria-label={title}
        className={buttonClass(options.active === true, options.className)}
        disabled={options.disabled}
        icon={icon}
        onClick={onClick}
        size="small"
        type="text"
      />
    </Tooltip>
  )

  const fontMenu: MenuProps = {
    items: fonts.map((font) => ({
      key: font.value || 'default',
      label: <span style={{ fontFamily: font.value || undefined }}>{font.label}</span>,
    })),
    selectedKeys: [activeFont || 'default'],
    onClick: ({ key }) => {
      const selectedFont = fonts.find((font) => (font.value || 'default') === key)
      if (selectedFont) setFontFamily(selectedFont.value)
    },
  }

  const colorDropdown = (
    <div className="memorica-editor-toolbar-dropdown memorica-editor-toolbar-color-grid">
      {colors.map((color) => (
        <Tooltip key={color} title={color}>
          <Button
            aria-label={`文字颜色 ${color}`}
            className="memorica-editor-toolbar-swatch"
            onClick={() => setFontColor(color)}
            size="small"
            style={{ backgroundColor: color }}
            type="text"
          />
        </Tooltip>
      ))}
      <Tooltip title="清除颜色">
        <Button
          aria-label="清除颜色"
          className="memorica-editor-toolbar-swatch memorica-editor-toolbar-clear-swatch"
          onClick={() => {
            richChain().unsetColor().run()
            setShowColorPicker(false)
          }}
          size="small"
          type="text"
        >
          ×
        </Button>
      </Tooltip>
    </div>
  )

  return (
    <div className="sticky top-12 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-[900px] mx-auto px-4 py-2">
        <div className="flex items-center gap-1 flex-wrap">
          {/* 撤销重做 */}
          <div className="flex items-center gap-0.5 mr-2">
            {renderToolbarButton('撤销', <UndoOutlined />, () => editor.chain().focus().undo().run(), {
              disabled: !editor.can().undo(),
            })}
            {renderToolbarButton('重做', <RedoOutlined />, () => editor.chain().focus().redo().run(), {
              disabled: !editor.can().redo(),
            })}
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 基础格式 */}
          <div className="flex items-center gap-0.5 mr-2">
            {renderToolbarButton('加粗', <BoldOutlined />, () => editor.chain().focus().toggleBold().run(), {
              active: editor.isActive('bold'),
            })}
            {renderToolbarButton('斜体', <ItalicOutlined />, () => editor.chain().focus().toggleItalic().run(), {
              active: editor.isActive('italic'),
            })}
            {renderToolbarButton('下划线', <UnderlineOutlined />, () => editor.chain().focus().toggleUnderline().run(), {
              active: editor.isActive('underline'),
            })}
            {renderToolbarButton('删除线', <StrikethroughOutlined />, () => editor.chain().focus().toggleStrike().run(), {
              active: editor.isActive('strike'),
            })}
            {renderToolbarButton('高亮', <HighlightOutlined />, () => editor.chain().focus().toggleHighlight().run(), {
              active: editor.isActive('highlight'),
            })}
            {renderToolbarButton('代码', <CodeOutlined />, () => editor.chain().focus().toggleCode().run(), {
              active: editor.isActive('code'),
            })}
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 上标下标 */}
          <div className="flex items-center gap-0.5 mr-2">
            {renderToolbarButton('下标', <SubnodeOutlined />, () => richChain().toggleSubscript().run(), {
              active: editor.isActive('subscript'),
            })}
            {renderToolbarButton('上标', <FontSizeOutlined />, () => richChain().toggleSuperscript().run(), {
              active: editor.isActive('superscript'),
            })}
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 颜色 */}
          <div className="mr-2">
            <Dropdown
              destroyOnHidden
              menu={{ items: [] }}
              onOpenChange={(open) => {
                setShowColorPicker(open)
                if (open) setShowFontPicker(false)
              }}
              open={showColorPicker}
              popupRender={() => colorDropdown}
              trigger={['click']}
            >
              <Button
                aria-label="文字颜色"
                className={buttonClass(!!activeColor, 'memorica-editor-toolbar-color-trigger')}
                icon={(
                  <span className="memorica-editor-toolbar-color-icon">
                    <BgColorsOutlined />
                    <span
                      className="memorica-editor-toolbar-color-bar"
                      style={{ backgroundColor: activeColor || 'transparent' }}
                    />
                  </span>
                )}
                size="small"
                type="text"
              />
            </Dropdown>
          </div>

          {/* 字体 */}
          <div className="mr-2">
            <Dropdown
              destroyOnHidden
              menu={fontMenu}
              onOpenChange={(open) => {
                setShowFontPicker(open)
                if (open) setShowColorPicker(false)
              }}
              open={showFontPicker}
              trigger={['click']}
            >
              <Button
                aria-label="字体"
                className={buttonClass(false)}
                icon={<FontSizeOutlined />}
                size="small"
                type="text"
              />
            </Dropdown>
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 标题 */}
          <div className="flex items-center gap-0.5 mr-2">
            {renderToolbarButton(
              'H1',
              <span className="memorica-editor-toolbar-text-icon">H1</span>,
              () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
              { active: editor.isActive('heading', { level: 1 }) },
            )}
            {renderToolbarButton(
              'H2',
              <span className="memorica-editor-toolbar-text-icon">H2</span>,
              () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
              { active: editor.isActive('heading', { level: 2 }) },
            )}
            {renderToolbarButton(
              'H3',
              <span className="memorica-editor-toolbar-text-icon">H3</span>,
              () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
              { active: editor.isActive('heading', { level: 3 }) },
            )}
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 列表 */}
          <div className="flex items-center gap-0.5 mr-2">
            {renderToolbarButton('无序列表', <UnorderedListOutlined />, () => editor.chain().focus().toggleBulletList().run(), {
              active: editor.isActive('bulletList'),
            })}
            {renderToolbarButton('有序列表', <OrderedListOutlined />, () => editor.chain().focus().toggleOrderedList().run(), {
              active: editor.isActive('orderedList'),
            })}
            {renderToolbarButton('任务列表', <CheckSquareOutlined />, () => editor.chain().focus().toggleTaskList().run(), {
              active: editor.isActive('taskList'),
            })}
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 对齐 */}
          <div className="flex items-center gap-0.5 mr-2">
            {renderToolbarButton('左对齐', <AlignLeftOutlined />, () => editor.chain().focus().setTextAlign('left').run(), {
              active: editor.isActive({ textAlign: 'left' }),
            })}
            {renderToolbarButton('居中', <AlignCenterOutlined />, () => editor.chain().focus().setTextAlign('center').run(), {
              active: editor.isActive({ textAlign: 'center' }),
            })}
            {renderToolbarButton('右对齐', <AlignRightOutlined />, () => editor.chain().focus().setTextAlign('right').run(), {
              active: editor.isActive({ textAlign: 'right' }),
            })}
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 插入 */}
          <div className="flex items-center gap-0.5 mr-2">
            {renderToolbarButton('引用', <BlockOutlined />, () => editor.chain().focus().toggleBlockquote().run(), {
              active: editor.isActive('blockquote'),
            })}
            {renderToolbarButton('分隔线', <MinusOutlined />, () => editor.chain().focus().setHorizontalRule().run())}
            {renderToolbarButton('链接', <LinkOutlined />, addLink, {
              active: editor.isActive('link'),
            })}
            {renderToolbarButton('图片 URL', <PictureOutlined />, addImage)}
            {onUploadImage && (
              renderToolbarButton(uploading ? '上传中' : '上传图片', <UploadOutlined />, onUploadImage, {
                disabled: uploading,
              })
            )}
            {onUploadAttachment && (
              renderToolbarButton(uploading ? '上传中' : '上传附件', <PaperClipOutlined />, onUploadAttachment, {
                disabled: uploading,
              })
            )}
            {renderToolbarButton('表格', <TableOutlined />, addTable, {
              active: editor.isActive('table'),
            })}
            {onCreateDiagram && (
              renderToolbarButton('图示', <PartitionOutlined />, onCreateDiagram)
            )}
            {renderToolbarButton('YouTube', <VideoCameraOutlined />, addYoutube)}
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1" />

        </div>
      </div>
    </div>
  )
}
