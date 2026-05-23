import { useState, useRef, useEffect, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { Search, Replace, X, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  editor: Editor | null
  open: boolean
  onClose: () => void
}

export default function FindReplace({ editor, open, onClose }: Props) {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [currentMatch, setCurrentMatch] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)
  const findInputRef = useRef<HTMLInputElement>(null)

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
    <div className="sticky top-12 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[900px] mx-auto px-8 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-gray-400" />
              <input
                ref={findInputRef}
                type="text"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="查找..."
                className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md outline-none focus:border-blue-400 transition"
              />
              {totalMatches > 0 && (
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {currentMatch} / {totalMatches}
                </span>
              )}
              <button
                onClick={() => goToMatch('prev')}
                disabled={totalMatches === 0}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => goToMatch('next')}
                disabled={totalMatches === 0}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition"
              >
                <ChevronDown size={16} />
              </button>
              <button
                onClick={() => setShowReplace(!showReplace)}
                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
              >
                {showReplace ? '隐藏替换' : '替换'}
              </button>
            </div>

            {showReplace && (
              <div className="flex items-center gap-2 pl-5">
                <Replace size={14} className="text-gray-400" />
                <input
                  type="text"
                  value={replace}
                  onChange={(e) => setReplace(e.target.value)}
                  placeholder="替换为..."
                  className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md outline-none focus:border-blue-400 transition"
                />
                <button
                  onClick={doReplace}
                  disabled={!find}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 transition"
                >
                  替换
                </button>
                <button
                  onClick={doReplaceAll}
                  disabled={!find}
                  className="text-xs px-3 py-1.5 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  全部替换
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
