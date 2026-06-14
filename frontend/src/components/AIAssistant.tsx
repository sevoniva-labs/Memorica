import { useState, useRef, useCallback, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import {
  aiActionLabels,
  aiActionIcons,
  type AIAction,
} from '../ai/aiActions'
import { generateAI } from '../api/client'
import {
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  FontSizeOutlined,
  LoadingOutlined,
  SwapOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

interface Props {
  editor: Editor | null
  open: boolean
  onClose: () => void
  initialAction?: AIAction | null
}

export default function AIAssistant({ editor, open, onClose, initialAction }: Props) {
  const [streaming, setStreaming] = useState(false)
  const [result, setResult] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [showInput, setShowInput] = useState(false)
  const abortRef = useRef(false)
  const hasRunInitial = useRef(false)

  const getSelectedText = useCallback(() => {
    if (!editor) return ''
    const { from, to } = editor.state.selection
    if (from === to) return ''
    return editor.state.doc.textBetween(from, to, '\n')
  }, [editor])

  const selectedText = getSelectedText()

  const runAI = useCallback(async (action: AIAction) => {
    if (!editor || streaming) return

    const text = getSelectedText() || editor.getText().slice(0, 500)
    if (!text.trim()) return

    setStreaming(true)
    setResult('')
    abortRef.current = false

    try {
      const response = await generateAI({
        action,
        text,
        customPrompt: action === 'custom' ? customPrompt : undefined,
      })
      if (!abortRef.current) {
        setResult(response.text)
      }
    } catch (err) {
      if (!abortRef.current) {
        setResult(err instanceof Error ? err.message : 'AI 服务暂时不可用')
      }
    } finally {
      setStreaming(false)
    }
  }, [customPrompt, editor, getSelectedText, streaming])

  // 监听 initialAction，自动执行
  useEffect(() => {
    if (initialAction && open && !hasRunInitial.current) {
      hasRunInitial.current = true
      runAI(initialAction)
    }
    if (!open) {
      hasRunInitial.current = false
    }
  }, [initialAction, open, runAI])

  const handleReplace = () => {
    if (!editor || !result) return
    const { from, to } = editor.state.selection
    if (from !== to) {
      editor.chain().focus().deleteRange({ from, to }).insertContent(result).run()
    } else {
      editor.chain().focus().insertContent(result).run()
    }
    reset()
    onClose()
  }

  const handleInsert = () => {
    if (!editor || !result) return
    editor.chain().focus().insertContent(result).run()
    reset()
    onClose()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
  }

  const handleCancel = () => {
    abortRef.current = true
    setStreaming(false)
  }

  const reset = () => {
    setResult('')
    setCustomPrompt('')
    setShowInput(false)
    abortRef.current = false
  }

  const handleClose = () => {
    handleCancel()
    reset()
    onClose()
  }

  if (!open) return null

  const quickActions: AIAction[] = [
    'continue',
    'polish',
    'summarize',
    'explain',
    'shorter',
    'longer',
    'professional',
    'translate-en',
    'translate-zh',
  ]

  return (
    <div className="absolute right-0 top-0 z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2">
          <ThunderboltOutlined className="text-blue-600" style={{ fontSize: 16 }} />
          <span className="text-sm font-semibold text-gray-800">AI 助手</span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded-md hover:bg-white/60 text-gray-400 hover:text-gray-600 transition"
        >
          <CloseOutlined style={{ fontSize: 14 }} />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* 选中文本预览 */}
        {selectedText && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <FontSizeOutlined style={{ fontSize: 12 }} />
              选中的内容
            </div>
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 border border-gray-100 line-clamp-4 leading-relaxed">
              {selectedText}
            </div>
          </div>
        )}

        {/* 快捷操作 */}
        {!result && !streaming && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500">快捷操作</div>
            <div className="grid grid-cols-3 gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => runAI(action)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition text-center"
                >
                  <span className="text-lg">{aiActionIcons[action]}</span>
                  <span className="text-[11px] text-gray-600 leading-tight">
                    {aiActionLabels[action]}
                  </span>
                </button>
              ))}
            </div>

            {/* 自定义 prompt */}
            {!showInput ? (
              <button
                onClick={() => setShowInput(true)}
                className="w-full text-xs text-blue-600 hover:text-blue-700 py-1.5 border border-dashed border-blue-200 rounded-lg hover:bg-blue-50/30 transition"
              >
                {aiActionIcons.custom} 自定义指令...
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customPrompt.trim()) {
                      runAI('custom')
                    }
                  }}
                  placeholder="输入你的指令，例如：把这段改写成诗歌"
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => runAI('custom')}
                    disabled={!customPrompt.trim()}
                    className="flex-1 text-xs py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    发送
                  </button>
                  <button
                    onClick={() => {
                      setShowInput(false)
                      setCustomPrompt('')
                    }}
                    className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 流式输出结果 */}
        {(result || streaming) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <ThunderboltOutlined className="text-blue-500" style={{ fontSize: 12 }} />
                AI 生成
              </div>
              {streaming && (
                <div className="flex items-center gap-1.5">
                  <LoadingOutlined spin className="text-blue-500" style={{ fontSize: 12 }} />
                  <span className="text-[11px] text-blue-500">生成中...</span>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-700 bg-blue-50/40 rounded-lg p-3 border border-blue-100 min-h-[80px] leading-relaxed whitespace-pre-wrap">
              {result}
              {streaming && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-blue-400 animate-pulse align-middle rounded-sm" />
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-1.5">
              {!streaming && (
                <>
                  <button
                    onClick={handleReplace}
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <SwapOutlined style={{ fontSize: 12 }} />
                    {selectedText ? '替换' : '插入'}
                  </button>
                  <button
                    onClick={handleInsert}
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    <CheckOutlined style={{ fontSize: 12 }} />
                    在下方插入
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition"
                    title="复制"
                  >
                    <CopyOutlined style={{ fontSize: 14 }} />
                  </button>
                </>
              )}
              {streaming && (
                <button
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition"
                >
                  <CloseOutlined style={{ fontSize: 12 }} />
                  停止生成
                </button>
              )}
            </div>

            {!streaming && (
              <button
                onClick={reset}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition"
              >
                重新选择操作
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
