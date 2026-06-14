import { useState, useRef, useEffect, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { CloseOutlined, DownOutlined, SearchOutlined, SwapOutlined, UpOutlined } from '@ant-design/icons'
import { Button, Input, Space, Tooltip, Typography } from 'antd'
import type { InputRef } from 'antd'

interface Props {
  editor: Editor | null
  open: boolean
  onClose: () => void
}

const { Text } = Typography

export default function FindReplace({ editor, open, onClose }: Props) {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [currentMatch, setCurrentMatch] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)
  const findInputRef = useRef<InputRef>(null)

  // 简单的文本搜索高亮
  const findAll = useCallback(() => {
    if (!editor || !find) {
      setTotalMatches(0)
      setCurrentMatch(0)
      return
    }
    const text = editor.getText()
    const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const matches = [...text.matchAll(regex)]
    setTotalMatches(matches.length)
    setCurrentMatch(matches.length > 0 ? 1 : 0)
  }, [editor, find])

  const goToMatch = useCallback((direction: 'next' | 'prev') => {
    if (!editor || !find || totalMatches === 0) return
    let next = direction === 'next' ? currentMatch + 1 : currentMatch - 1
    if (next > totalMatches) next = 1
    if (next < 1) next = totalMatches
    setCurrentMatch(next)

    // 使用浏览器 find 功能定位
    const win = window as unknown as { find: (a: string, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean) => boolean }
    if (typeof win.find === 'function') {
      if (direction === 'next') {
        win.find(find, false, false, true, false, false)
      } else {
        win.find(find, false, true, true, false, false)
      }
    }
  }, [editor, find, totalMatches, currentMatch])

  const doReplace = useCallback(() => {
    if (!editor || !find) return
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to)
    if (selectedText.toLowerCase() === find.toLowerCase()) {
      editor.chain().focus().deleteRange({ from, to }).insertContent(replace).run()
      findAll()
    } else {
      goToMatch('next')
    }
  }, [editor, find, replace, goToMatch, findAll])

  const doReplaceAll = useCallback(() => {
    if (!editor || !find) return
    const text = editor.getText()
    const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const newText = text.replace(regex, replace)
    editor.chain().focus().setContent(newText).run()
    findAll()
  }, [editor, find, replace, findAll])

  useEffect(() => {
    if (open && findInputRef.current) {
      setTimeout(() => findInputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    const timer = setTimeout(findAll, 300)
    return () => clearTimeout(timer)
  }, [find, findAll])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="memorica-find-bar sticky top-12 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="memorica-find-inner max-w-[900px] mx-auto px-8 py-3">
        <div className="memorica-find-panel">
          <div className="memorica-find-fields">
            <Space className="memorica-find-row" size="small" align="center">
              <Input
                ref={findInputRef}
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="查找..."
                prefix={<SearchOutlined className="memorica-find-icon" />}
                allowClear
                size="small"
                className="memorica-find-input"
              />
              {totalMatches > 0 && (
                <Text type="secondary" className="memorica-find-count">
                  {currentMatch} / {totalMatches}
                </Text>
              )}
              <Tooltip title="上一个匹配">
                <Button
                  aria-label="上一个匹配"
                  onClick={() => goToMatch('prev')}
                  disabled={totalMatches === 0}
                  icon={<UpOutlined />}
                  size="small"
                  type="text"
                />
              </Tooltip>
              <Tooltip title="下一个匹配">
                <Button
                  aria-label="下一个匹配"
                  onClick={() => goToMatch('next')}
                  disabled={totalMatches === 0}
                  icon={<DownOutlined />}
                  size="small"
                  type="text"
                />
              </Tooltip>
              <Button
                aria-pressed={showReplace}
                icon={<SwapOutlined />}
                onClick={() => setShowReplace(!showReplace)}
                size="small"
                type="text"
              >
                {showReplace ? '隐藏替换' : '替换'}
              </Button>
            </Space>

            {showReplace && (
              <Space className="memorica-find-row memorica-find-replace-row" size="small" align="center">
                <Input
                  value={replace}
                  onChange={(e) => setReplace(e.target.value)}
                  placeholder="替换为..."
                  prefix={<SwapOutlined className="memorica-find-icon" />}
                  allowClear
                  size="small"
                  className="memorica-find-input"
                />
                <Button
                  onClick={doReplace}
                  disabled={!find}
                  size="small"
                  type="primary"
                >
                  替换
                </Button>
                <Button
                  onClick={doReplaceAll}
                  disabled={!find}
                  size="small"
                >
                  全部替换
                </Button>
              </Space>
            )}
          </div>

          <Tooltip title="关闭查找替换">
            <Button
              aria-label="关闭查找替换"
              onClick={onClose}
              icon={<CloseOutlined />}
              size="small"
              type="text"
            />
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
