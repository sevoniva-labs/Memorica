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
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { AIAction } from '../ai/aiActions'
import BubbleMenuBar from './BubbleMenuBar'
import SlashMenu from './SlashMenu'
import Toolbar from './Toolbar'
import AIAssistant from './AIAssistant'
import FindReplace from './FindReplace'
import ShareSettingsPanel from './ShareSettingsPanel'
import { getVersion, updateDocumentMeta, saveVersion } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { useSidebar } from '../contexts/SidebarContext'
import Dropdown from '@douyinfe/semi-ui-19/lib/es/dropdown'
import { ArrowLeft, Download, FileText, History, Loader2, MoreHorizontal, RefreshCw, Save, Search, Share2, Sparkles, Type } from 'lucide-react'

interface Props {
  docId?: string
  userName?: string
  userColor?: string
  initialTitle?: string
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function defaultWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

function normalizeConnectionStatus(status?: string): ConnectionStatus {
  return status === 'connected' || status === 'disconnected' ? status : 'connecting'
}

function tokenExpiresSoon(token: string, graceSeconds = 60) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || '')) as { exp?: number }
    return !payload.exp || payload.exp * 1000 <= Date.now() + graceSeconds * 1000
  } catch {
    return true
  }
}

async function getCollaborationToken() {
  const token = localStorage.getItem('accessToken')
  if (token && !tokenExpiresSoon(token)) {
    return token
  }
  return (await useAuthStore.getState().refreshAccessToken()) || ''
}

export default function CollabEditor({
  docId = 'default-doc',
  userName = '匿名用户',
  userColor = '#2563eb',
  initialTitle,
}: Props) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [title, setTitle] = useState(initialTitle || '未命名文档')
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [mode, setMode] = useState<'notion' | 'rich'>('notion')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiInitialAction, setAiInitialAction] = useState<AIAction | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [connectionIssue, setConnectionIssue] = useState('')
  const [collaboratorCount, setCollaboratorCount] = useState(1)
  const [, setTitleSaveState] = useState<SaveState>('idle')
  const [versionSaveState, setVersionSaveState] = useState<SaveState>('idle')
  const [contentRevision, setContentRevision] = useState(0)
  const [, setLastSavedAt] = useState<Date | null>(null)
  const { updateDocTitle } = useSidebar()
  const lastVersionFingerprintRef = useRef('')
  const versionSavingRef = useRef(false)
  const versionResetTimerRef = useRef<number | null>(null)
  const restoredVersionRef = useRef<number | null>(null)
  const mentionUsers = useMemo(() => [{ id: 'current-user', label: userName }], [userName])

  // 创建 Yjs Doc 和 Hocuspocus Provider
  const [yDoc] = useState(() => new Y.Doc())
  const [sessionId] = useState(() => crypto.randomUUID().slice(0, 8))
  const [provider] = useState(() => {
    const baseUrl = import.meta.env.VITE_WS_URL || defaultWebSocketUrl()
    const url = `${baseUrl}?sessionId=${sessionId}`
    return new HocuspocusProvider({
      url,
      name: docId,
      document: yDoc,
      token: getCollaborationToken,
      onAuthenticated: () => {
        setConnectionStatus('connected')
        setConnectionIssue('')
      },
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
      setContentRevision((revision) => revision + 1)
    },
  })

  useEffect(() => {
    // 实时同步全局 sidebar 列表中的标题
    updateDocTitle(docId, title.trim())
    if (!title.trim()) return
    const t = setTimeout(() => {
      updateDocumentMeta(docId, title.trim())
        .then(() => {
          setTitleSaveState('saved')
          setLastSavedAt(new Date())
        })
        .catch(() => setTitleSaveState('error'))
    }, 800)
    return () => clearTimeout(t)
  }, [docId, title, updateDocTitle])

  useEffect(() => {
    const handleStatus = ({ status }: { status: ConnectionStatus }) => {
      setConnectionStatus(status)
      if (status === 'connecting') {
        setConnectionIssue('')
      }
    }
    const handleAwareness = ({ states }: { states: unknown[] }) => {
      setCollaboratorCount(Math.max(1, states.length))
    }
    const handleAuthenticationFailed = ({ reason }: { reason?: string }) => {
      setConnectionStatus('disconnected')
      setConnectionIssue(reason || '协作认证失败')
      useAuthStore.getState().refreshAccessToken().then((freshToken) => {
        if (freshToken) {
          provider.configuration.websocketProvider.disconnect()
          provider.configuration.websocketProvider.connect()
        }
      })
    }
    const handleAuthenticated = () => {
      setConnectionIssue('')
    }
    provider.on('status', handleStatus)
    provider.on('awarenessChange', handleAwareness)
    provider.on('authenticationFailed', handleAuthenticationFailed)
    provider.on('authenticated', handleAuthenticated)
    const syncInitialStatus = window.setTimeout(() => {
      setConnectionStatus(normalizeConnectionStatus(provider.configuration.websocketProvider.status))
    }, 0)
    return () => {
      window.clearTimeout(syncInitialStatus)
      provider.off('status', handleStatus)
      provider.off('awarenessChange', handleAwareness)
      provider.off('authenticationFailed', handleAuthenticationFailed)
      provider.off('authenticated', handleAuthenticated)
    }
  }, [provider])

  useEffect(() => {
    return () => {
      if (versionResetTimerRef.current) {
        window.clearTimeout(versionResetTimerRef.current)
      }
      provider.destroy()
    }
  }, [provider])

  const connected = connectionStatus === 'connected'

  const saveCurrentVersion = useCallback(async (source: 'manual' | 'auto' | 'restore') => {
    if (!editor || versionSavingRef.current) return
    const json = JSON.stringify(editor.getJSON())
    const html = editor.getHTML()
    if (json === lastVersionFingerprintRef.current) return

    versionSavingRef.current = true
    setVersionSaveState('saving')
    try {
      const result = await saveVersion(docId, json, html, wordCount, charCount, source)
      lastVersionFingerprintRef.current = json
      setVersionSaveState(result?.saved === false ? 'idle' : 'saved')
      setLastSavedAt(new Date())
      if (versionResetTimerRef.current) {
        window.clearTimeout(versionResetTimerRef.current)
      }
      versionResetTimerRef.current = window.setTimeout(() => setVersionSaveState('idle'), 2200)
    } catch {
      setVersionSaveState('error')
    } finally {
      versionSavingRef.current = false
    }
  }, [charCount, docId, editor, wordCount])

  // 拦截 Ctrl+S / Cmd+S，保存版本而不是浏览器保存网页
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveCurrentVersion('manual')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [saveCurrentVersion])

  useEffect(() => {
    if (!editor || !connected || contentRevision === 0) return
    const t = window.setTimeout(() => {
      saveCurrentVersion('auto')
    }, 12000)
    return () => window.clearTimeout(t)
  }, [connected, contentRevision, editor, saveCurrentVersion])

  useEffect(() => {
    const versionId = Number(searchParams.get('restoreVersion'))
    if (!editor || !connected || !versionId || restoredVersionRef.current === versionId) return
    restoredVersionRef.current = versionId
    getVersion(versionId)
      .then((version) => {
        editor.commands.setContent(JSON.parse(version.contentJson || '{}'))
        window.setTimeout(() => saveCurrentVersion('restore'), 300)
        window.history.replaceState(null, '', `/doc/${docId}`)
      })
      .catch(() => {
        setVersionSaveState('error')
      })
  }, [connected, docId, editor, saveCurrentVersion, searchParams])

  const reconnectCollaboration = () => {
    setConnectionStatus('connecting')
    setConnectionIssue('')
    provider.configuration.websocketProvider.disconnect()
    provider.configuration.websocketProvider.connect()
  }

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

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle)
    if (nextTitle.trim()) {
      setTitleSaveState('saving')
    }
  }

  return (
    <div className="memorica-editor-shell">
      <div className="memorica-editor-topbar">
        <div className="memorica-editor-bar-inner">
          {/* 左侧：返回 + 标题 */}
          <div className="memorica-editor-left">
            <button
              type="button"
              className="memorica-editor-icon-btn"
              onClick={() => navigate('/')}
              title="返回"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <input
              type="text"
              className="memorica-editor-title-input"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="无标题"
            />
          </div>

          {/* 中间：协作状态（简化为圆点） */}
          <div className="memorica-editor-center">
            <span
              className="memorica-editor-collab-dot"
              data-status={connectionStatus}
              title={connected ? `${collaboratorCount} 人在线` : connectionIssue || '协作已断开'}
            >
              <span className="memorica-editor-collab-indicator" />
              <span className="memorica-editor-collab-text">
                {connected ? '协作中' : connectionStatus === 'connecting' ? '连接中' : '已断开'}
              </span>
            </span>
            {!connected && connectionStatus === 'disconnected' && (
              <button
                type="button"
                className="memorica-editor-icon-btn"
                onClick={reconnectCollaboration}
                title="重新连接"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 右侧：分享 + AI + 更多 */}
          <div className="memorica-editor-right">
            <button
              type="button"
              className="memorica-editor-btn-primary"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="w-4 h-4" />
              <span>分享</span>
            </button>
            <button
              type="button"
              className={aiOpen ? 'memorica-editor-btn active' : 'memorica-editor-btn'}
              onClick={() => setAiOpen(!aiOpen)}
              title="AI 助手"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
            </button>
            <Dropdown
              trigger="click"
              position="bottomRight"
              menu={[
                { node: 'item', name: '查找替换', icon: <Search className="w-4 h-4" />, onClick: () => setFindOpen(true) },
                { node: 'item', name: versionSaveState === 'saving' ? '保存版本中...' : '保存版本', icon: versionSaveState === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />, onClick: () => saveCurrentVersion('manual') },
                { node: 'item', name: '历史版本', icon: <History className="w-4 h-4" />, onClick: () => navigate(`/doc/${docId}/versions`) },
                { node: 'divider' },
                { node: 'item', name: `切换为${mode === 'notion' ? '富文本' : '轻文档'}`, icon: <FileText className="w-4 h-4" />, onClick: () => setMode(mode === 'notion' ? 'rich' : 'notion') },
                { node: 'item', name: `字数 ${wordCount} 词 / ${charCount} 字`, icon: <Type className="w-4 h-4" /> },
                { node: 'divider' },
                { node: 'item', name: '导出 HTML', icon: <Download className="w-4 h-4" />, onClick: exportHtml },
                ...(connectionStatus === 'disconnected' ? [{ node: 'item' as const, name: '重新连接协作', icon: <RefreshCw className="w-4 h-4" />, onClick: reconnectCollaboration }] : []),
              ]}
            >
              <button type="button" className="memorica-editor-btn" title="更多">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </Dropdown>
          </div>
        </div>
      </div>
      {mode === 'rich' && <Toolbar editor={editor} />}
      <ShareSettingsPanel docId={docId} open={shareOpen} onClose={() => setShareOpen(false)} />
      <FindReplace editor={editor} open={findOpen} onClose={() => setFindOpen(false)} />
      {aiOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-sm">
            <AIAssistant editor={editor} open={aiOpen} onClose={() => { setAiOpen(false); setAiInitialAction(null) }} initialAction={aiInitialAction} />
          </div>
        </div>
      )}

      {/* AI 助手 - 桌面端浮动面板 */}
      {aiOpen && (
        <div className="fixed right-6 top-24 z-30 hidden lg:block">
          <AIAssistant editor={editor} open={aiOpen} onClose={() => { setAiOpen(false); setAiInitialAction(null) }} initialAction={aiInitialAction} />
        </div>
      )}

      <div className="max-w-[900px] mx-auto px-8 py-8">
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
