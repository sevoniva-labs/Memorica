import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TextAlign } from '@tiptap/extension-text-align'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import HighlightExtension from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { FontFamily } from '@tiptap/extension-font-family'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Mention } from '@tiptap/extension-mention'
import { Youtube } from '@tiptap/extension-youtube'
import { CharacterCount } from '@tiptap/extension-character-count'
import Mathematics from '@tiptap/extension-mathematics'
import { Emoji } from '@tiptap/extension-emoji'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { Collaboration } from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AIAction } from '../ai/mockAI'
import BubbleMenuBar from './BubbleMenuBar'
import SlashMenu from './SlashMenu'
import Toolbar from './Toolbar'
import AIAssistant from './AIAssistant'
import FindReplace from './FindReplace'
import { updateDocumentMeta, saveVersion } from '../api/client'
import { ArrowLeft, History, Save } from 'lucide-react'

interface Props {
  docId?: string
  userName?: string
  userColor?: string
  initialTitle?: string
}

const mentionUsers = [
  { id: '1', label: '张三' },
  { id: '2', label: '李四' },
  { id: '3', label: '王五' },
  { id: '4', label: '赵六' },
]

export default function CollabEditor({
  docId = 'default-doc',
  userName = '匿名用户',
  userColor = '#2563eb',
  initialTitle,
}: Props) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(initialTitle || '未命名文档')
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [mode, setMode] = useState<'notion' | 'rich'>('notion')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiInitialAction, setAiInitialAction] = useState<AIAction | null>(null)
  const [findOpen, setFindOpen] = useState(false)

  // 创建 Yjs Doc 和 Hocuspocus Provider
  const [yDoc] = useState(() => new Y.Doc())
  const token = localStorage.getItem('accessToken') || undefined
  const [provider] = useState(() => {
    return new HocuspocusProvider({
      url: import.meta.env.VITE_WS_URL || 'ws://localhost:1234',
      name: docId,
      document: yDoc,
      token: token,
    })
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
        undoRedo: false, // Collaboration 自带历史管理，禁用默认的 undoRedo
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return `标题 ${node.attrs.level}`
          return "输入 '/' 查看命令..."
        },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ HTMLAttributes: { class: 'notion-image' } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      HighlightExtension.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      FontFamily.configure({ types: ['textStyle'] }),
      Subscript,
      Superscript,
      Mention.configure({
        suggestion: {
          items: ({ query }: { query: string }) =>
            mentionUsers.filter((u) => u.label.toLowerCase().includes(query.toLowerCase())).slice(0, 5),
        },
      }),
      Emoji.configure({ enableEmoticons: true }),
      Youtube.configure({ inline: false, width: 640, height: 360, HTMLAttributes: { class: 'youtube-embed' } }),
      CharacterCount.configure({ mode: 'textSize' }),
      Mathematics.configure({ katexOptions: { throwOnError: false } }),
      // 协作扩展
      Collaboration.configure({ document: yDoc }),
      CollaborationCaret.configure({
        provider,
        user: { name: userName, color: userColor },
      }),
    ],
    editorProps: {
      attributes: { class: 'notion-editor' },
    },
    onUpdate: ({ editor }) => {
      setWordCount(editor.getText().split(/\s+/).filter(Boolean).length)
      setCharCount(editor.storage.characterCount?.characters() ?? 0)
    },
  })

  // Debounce save title to backend
  const titleRef = useRef(title)
  titleRef.current = title
  const saveTitle = useCallback(() => {
    updateDocumentMeta(docId, titleRef.current).catch(() => {})
  }, [docId])

  useEffect(() => {
    const t = setTimeout(saveTitle, 800)
    return () => clearTimeout(t)
  }, [title, saveTitle])

  useEffect(() => {
    return () => {
      provider.destroy()
    }
  }, [provider])

  const exportHtml = () => {
    if (!editor) return
    const html = `<h1>${title}</h1>` + editor.getHTML()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${docId}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[900px] mx-auto px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => navigate('/')} className="p-1 hover:bg-gray-100 rounded-md transition">
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="font-medium text-gray-700">Memorica</span>
            <span>/</span>
            <span className="truncate max-w-[200px]">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setFindOpen(!findOpen)} className={`text-xs px-3 py-1.5 rounded-md transition ${findOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>查找</button>
            <button onClick={() => setAiOpen(!aiOpen)} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md transition ${aiOpen ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>AI</button>
            <button onClick={async () => {
              if (!editor) return
              try {
                const json = JSON.stringify(editor.getJSON())
                const html = editor.getHTML()
                await saveVersion(docId, json, html, wordCount, charCount)
                alert('版本已保存')
              } catch {
                alert('保存版本失败')
              }
            }} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition">
              <Save className="w-3.5 h-3.5" />
              保存版本
            </button>
            <button onClick={() => navigate(`/doc/${docId}/versions`)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition">
              <History className="w-3.5 h-3.5" />
              历史
            </button>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setMode('notion')} className={`px-3 py-1 text-xs rounded-md transition ${mode === 'notion' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Notion</button>
              <button onClick={() => setMode('rich')} className={`px-3 py-1 text-xs rounded-md transition ${mode === 'rich' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>富文本</button>
            </div>
            <span className="text-xs text-gray-400">{wordCount} 词 / {charCount} 字</span>
            <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: userColor }} />{userName}</span>
            <button onClick={exportHtml} className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition">导出</button>
          </div>
        </div>
      </div>
      {mode === 'rich' && <Toolbar editor={editor} />}
      <FindReplace editor={editor} open={findOpen} onClose={() => setFindOpen(false)} />
      <div className="max-w-[900px] mx-auto px-8 py-8 relative">
        <div className="absolute -right-[340px] top-8 w-80 hidden lg:block">
          <AIAssistant editor={editor} open={aiOpen} onClose={() => { setAiOpen(false); setAiInitialAction(null) }} initialAction={aiInitialAction} />
        </div>
        {aiOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/20 backdrop-blur-sm">
            <div className="w-full max-w-sm">
              <AIAssistant editor={editor} open={aiOpen} onClose={() => { setAiOpen(false); setAiInitialAction(null) }} initialAction={aiInitialAction} />
            </div>
          </div>
        )}
        <div className="mb-6">
          <textarea value={title} onChange={(e) => setTitle(e.target.value)} placeholder="无标题" className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none resize-none bg-transparent leading-tight" rows={1} />
        </div>
        <div className="relative">
          {mode === 'notion' && editor && (
            <DragHandle editor={editor}>
              <div className="drag-handle">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="3" cy="3" r="1.5" /><circle cx="7" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" /><circle cx="3" cy="7" r="1.5" /><circle cx="7" cy="7" r="1.5" /><circle cx="11" cy="7" r="1.5" /><circle cx="3" cy="11" r="1.5" /><circle cx="7" cy="11" r="1.5" /><circle cx="11" cy="11" r="1.5" /></svg>
              </div>
            </DragHandle>
          )}
          {mode === 'notion' && <BubbleMenuBar editor={editor} onAskAI={() => setAiOpen(true)} />}
          <EditorContent editor={editor} />
          <SlashMenu editor={editor} onAskAI={(action) => { setAiInitialAction(action); setAiOpen(true) }} />
        </div>
      </div>
    </div>
  )
}
