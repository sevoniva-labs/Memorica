import type { ReactNode } from 'react'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BgColorsOutlined,
  BoldOutlined,
  CodeOutlined,
  FontSizeOutlined,
  HighlightOutlined,
  ItalicOutlined,
  LinkOutlined,
  StrikethroughOutlined,
  SubnodeOutlined,
  ThunderboltOutlined,
  UnderlineOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Tooltip } from 'antd'
import type { MenuProps } from 'antd'

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

const clearColorKey = '__clear_color__'
const defaultFontKey = '__default_font__'
const iconStyle = { fontSize: 14 }

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
  if (!editor) return null

  const richChain = () => editor.chain().focus() as unknown as RichTextChain
  const currentColor = editor.getAttributes('textStyle').color as string | undefined

  const buttonClass = (active: boolean, extraClass = '') =>
    `memorica-bubble-button${active ? ' memorica-bubble-button-active' : ''}${extraClass ? ` ${extraClass}` : ''}`

  const renderIconButton = (
    label: string,
    icon: ReactNode,
    onClick: () => void,
    active = false,
    extraClass = ''
  ) => (
    <Tooltip title={label}>
      <Button
        aria-label={label}
        className={buttonClass(active, extraClass)}
        icon={icon}
        onClick={onClick}
        size="small"
        title={label}
        type="text"
      />
    </Tooltip>
  )

  const handleColorMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === clearColorKey) {
      richChain().unsetColor().run()
      return
    }
    richChain().setColor(String(key)).run()
  }

  const handleFontMenuClick: MenuProps['onClick'] = ({ key }) => {
    const font = key === defaultFontKey ? '' : String(key)
    if (font) {
      richChain().setFontFamily(font).run()
    } else {
      richChain().unsetFontFamily().run()
    }
  }

  const colorMenuItems: MenuProps['items'] = [
    ...colors.map((color) => ({
      key: color,
      label: (
        <span className="memorica-bubble-color-option">
          <span
            aria-hidden="true"
            className="memorica-bubble-color-swatch"
            style={{ backgroundColor: color }}
          />
          <span>{color}</span>
        </span>
      ),
    })),
    {
      key: clearColorKey,
      label: <span className="memorica-bubble-clear-option">清除颜色</span>,
    },
  ]

  const fontMenuItems: MenuProps['items'] = fonts.map((font) => ({
    key: font.value || defaultFontKey,
    label: (
      <span className="memorica-bubble-font-option" style={font.value ? { fontFamily: font.value } : undefined}>
        {font.label}
      </span>
    ),
  }))

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={100}
      className="memorica-bubble-menu"
    >
      {renderIconButton('加粗', <BoldOutlined style={iconStyle} />, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {renderIconButton('斜体', <ItalicOutlined style={iconStyle} />, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {renderIconButton('下划线', <UnderlineOutlined style={iconStyle} />, () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}
      {renderIconButton('删除线', <StrikethroughOutlined style={iconStyle} />, () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'))}
      <div className="memorica-bubble-divider" />
      {renderIconButton('代码', <CodeOutlined style={iconStyle} />, () => editor.chain().focus().toggleCode().run(), editor.isActive('code'))}
      {renderIconButton('链接', <LinkOutlined style={iconStyle} />, () => {
          const url = window.prompt('链接 URL:')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }, editor.isActive('link'))}
      {renderIconButton('高亮', <HighlightOutlined style={iconStyle} />, () => editor.chain().focus().toggleHighlight().run(), editor.isActive('highlight'))}
      <div className="memorica-bubble-divider" />
      {renderIconButton('下标', <SubnodeOutlined style={iconStyle} />, () => richChain().toggleSubscript().run(), editor.isActive('subscript'))}
      {renderIconButton('上标', <FontSizeOutlined style={iconStyle} />, () => richChain().toggleSuperscript().run(), editor.isActive('superscript'))}
      <div className="memorica-bubble-divider" />
      <Tooltip title="文字颜色">
        <Dropdown menu={{ items: colorMenuItems, onClick: handleColorMenuClick }} trigger={['click']}>
          <Button
            aria-label="文字颜色"
            className={buttonClass(!!currentColor)}
            icon={(
              <span className="memorica-bubble-color-button-icon">
                <BgColorsOutlined style={iconStyle} />
                <span
                  aria-hidden="true"
                  className="memorica-bubble-color-indicator"
                  style={{ backgroundColor: currentColor || 'transparent' }}
                />
              </span>
            )}
            size="small"
            title="文字颜色"
            type="text"
          />
        </Dropdown>
      </Tooltip>
      <Tooltip title="字体">
        <Dropdown menu={{ items: fontMenuItems, onClick: handleFontMenuClick }} trigger={['click']}>
          <Button
            aria-label="字体"
            className={buttonClass(false)}
            icon={<FontSizeOutlined style={iconStyle} />}
            size="small"
            title="字体"
            type="text"
          />
        </Dropdown>
      </Tooltip>
      <div className="memorica-bubble-divider" />
      {renderIconButton('左对齐', <AlignLeftOutlined style={iconStyle} />, () => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }))}
      {renderIconButton('居中', <AlignCenterOutlined style={iconStyle} />, () => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }))}
      {renderIconButton('右对齐', <AlignRightOutlined style={iconStyle} />, () => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }))}
      {onAskAI && (
        <>
          <div className="memorica-bubble-divider" />
          <Tooltip title="AI 助手">
            <Button
              aria-label="AI 助手"
              className="memorica-bubble-button memorica-bubble-ai-button"
              icon={<ThunderboltOutlined style={iconStyle} />}
              onClick={onAskAI}
              size="small"
              title="AI 助手"
              type="text"
            >
              AI
            </Button>
          </Tooltip>
        </>
      )}
    </BubbleMenu>
  )
}
