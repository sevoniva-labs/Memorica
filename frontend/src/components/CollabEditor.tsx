import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'
import { Link } from '@tiptap/extension-link'
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
import DrawioDialog from './DrawioDialog'
import DiagramTemplatePicker from './DiagramTemplatePicker'
import { Diagram, type DiagramActionPayload, type DiagramAttrs, type DiagramEditPayload } from '../extensions/Diagram'
import type { DiagramTemplate } from '../diagram/templates'
import { Attachment, type AttachmentAttrs } from '../extensions/Attachment'
import { DocumentImage } from '../extensions/DocumentImage'
import { apiErrorMessage, getVersion, listVersions, updateDocumentMeta, saveVersion, saveVersionKeepalive, uploadFile } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { useSidebar } from '../contexts/SidebarContext'
import { App as AntdApp, Dropdown, Input, Modal } from 'antd'
import type { MenuProps } from 'antd'
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  EllipsisOutlined,
  FileTextOutlined,
  FontSizeOutlined,
  HistoryOutlined,
  LoadingOutlined,
  PaperClipOutlined,
  PartitionOutlined,
  PictureOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShareAltOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

interface Props {
  docId?: string
  userName?: string
  userColor?: string
  initialTitle?: string
  initialCanWrite?: boolean
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'
type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'local'
type SaveSource = 'manual' | 'auto' | 'restore'

interface PendingDiagram {
  xml: string
  title: string
}

interface LocalDraft {
  contentJson: string
  snapshotHtml: string
  title: string
  wordCount: number
  charCount: number
  updatedAt: string
}

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

function draftStorageKey(docId: string) {
  return `memorica:draft:${docId}`
}

function readLocalDraft(key: string): LocalDraft | null {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as LocalDraft : null
  } catch {
    return null
  }
}

function writeLocalDraft(key: string, draft: LocalDraft) {
  try {
    localStorage.setItem(key, JSON.stringify(draft))
  } catch {
    return
  }
}

function removeLocalDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    return
  }
}

function snapshotEditor(editor: Editor, title: string): LocalDraft {
  const text = editor.getText()
  return {
    contentJson: JSON.stringify(editor.getJSON()),
    snapshotHtml: editor.getHTML(),
    title: title.trim() || '未命名文档',
    wordCount: text.split(/\s+/).filter(Boolean).length,
    charCount: editor.storage.characterCount?.characters() ?? text.length,
    updatedAt: new Date().toISOString(),
  }
}

function saveStateText(state: SaveState, issue = '') {
  if (state === 'saving') return '正在保存'
  if (state === 'saved') return '已保存'
  if (state === 'local') return issue.startsWith('网络不可用') ? '离线中' : '正在保存'
  if (state === 'error') return '保存失败'
  return '已保存'
}

function shouldShowSavedAt(state: SaveState) {
  return state === 'saved' || state === 'idle'
}

function formatSavedAt(value: Date | null) {
  if (!value) return ''
  return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function CollabEditor({
  docId = 'default-doc',
  userName = '匿名用户',
  userColor = '#2563eb',
  initialTitle,
  initialCanWrite = true,
}: Props) {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [searchParams] = useSearchParams()
  const [title, setTitle] = useState(initialTitle || '未命名文档')
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [mode, setMode] = useState<'notion' | 'rich'>('notion')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiInitialAction, setAiInitialAction] = useState<AIAction | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [drawioOpen, setDrawioOpen] = useState(false)
  const [activeDiagram, setActiveDiagram] = useState<DiagramEditPayload | null>(null)
  const [pendingDiagram, setPendingDiagram] = useState<PendingDiagram | null>(null)
  const [renameDiagram, setRenameDiagram] = useState<DiagramActionPayload | null>(null)
  const [renameDiagramTitle, setRenameDiagramTitle] = useState('')
  const [deleteDiagram, setDeleteDiagram] = useState<DiagramActionPayload | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [connectionIssue, setConnectionIssue] = useState('')
  const [collaboratorCount, setCollaboratorCount] = useState(1)
  const [canEdit, setCanEdit] = useState(initialCanWrite)
  const [, setTitleSaveState] = useState<SaveState>('idle')
  const [versionSaveState, setVersionSaveState] = useState<SaveState>('idle')
  const [saveIssue, setSaveIssue] = useState('')
  const [contentRevision, setContentRevision] = useState(0)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const { updateDocTitle } = useSidebar()
  const draftKey = useMemo(() => draftStorageKey(docId), [docId])
  const [recoverableDraft, setRecoverableDraft] = useState<LocalDraft | null>(() => readLocalDraft(draftStorageKey(docId)))
  const localDraftRef = useRef<LocalDraft | null>(recoverableDraft)
  const lastVersionFingerprintRef = useRef('')
  const versionSavingRef = useRef(false)
  const saveCurrentVersionRef = useRef<(source: SaveSource) => Promise<void>>(async () => {})
  const queuedSaveSourceRef = useRef<SaveSource | null>(null)
  const retrySaveTimerRef = useRef<number | null>(null)
  const versionResetTimerRef = useRef<number | null>(null)
  const hasUnsavedChangesRef = useRef(false)
  const restoredVersionRef = useRef<number | null>(null)
  const bootstrappedVersionRef = useRef(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const mentionUsers = useMemo(() => [{ id: 'current-user', label: userName }], [userName])

  const openCreateDiagram = useCallback(() => {
    if (!canEdit) return
    setActiveDiagram(null)
    setPendingDiagram(null)
    setTemplatePickerOpen(true)
  }, [canEdit])

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
      onAuthenticated: ({ scope }: { scope?: string }) => {
        setConnectionStatus('connected')
        setConnectionIssue('')
        setCanEdit(scope !== 'readonly')
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
      DocumentImage.configure({ HTMLAttributes: { class: 'notion-image' } }),
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
      Attachment,
      Diagram,
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
      hasUnsavedChangesRef.current = true
      setSaveIssue('')
      setVersionSaveState((state) => state === 'saving' ? state : 'saving')
      setContentRevision((revision) => revision + 1)
    },
  })

  useEffect(() => {
    editor?.setEditable(canEdit)
  }, [canEdit, editor])

  useEffect(() => {
    const handleDiagramEdit = (event: Event) => {
      if (!canEdit) return
      const detail = (event as CustomEvent<DiagramEditPayload>).detail
      if (!detail) return
      setActiveDiagram(detail)
      setPendingDiagram(null)
      setDrawioOpen(true)
    }
    window.addEventListener('memorica:diagram-edit', handleDiagramEdit)
    return () => window.removeEventListener('memorica:diagram-edit', handleDiagramEdit)
  }, [canEdit])

  useEffect(() => {
    const handleDiagramAction = (event: Event) => {
      if (!canEdit) return
      const detail = (event as CustomEvent<DiagramActionPayload>).detail
      if (!detail) return

      if (detail.action === 'edit') {
        setActiveDiagram({ attrs: detail.attrs, updateAttributes: detail.updateAttributes })
        setPendingDiagram(null)
        setDrawioOpen(true)
      }
      if (detail.action === 'rename') {
        setRenameDiagram(detail)
        setRenameDiagramTitle(detail.attrs.title || '图示')
      }
      if (detail.action === 'duplicate') {
        detail.duplicate()
        setVersionSaveState('saving')
        window.setTimeout(() => void saveCurrentVersionRef.current('auto'), 300)
      }
      if (detail.action === 'delete') {
        setDeleteDiagram(detail)
      }
    }

    window.addEventListener('memorica:diagram-action', handleDiagramAction)
    return () => window.removeEventListener('memorica:diagram-action', handleDiagramAction)
  }, [canEdit])

  useEffect(() => {
    // 实时同步全局 sidebar 列表中的标题
    updateDocTitle(docId, title.trim())
    if (!canEdit || !title.trim()) return
    const t = setTimeout(() => {
      updateDocumentMeta(docId, title.trim())
        .then(() => {
          setTitleSaveState('saved')
          setLastSavedAt(new Date())
        })
        .catch(() => setTitleSaveState('error'))
    }, 800)
    return () => clearTimeout(t)
  }, [canEdit, docId, title, updateDocTitle])

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
    const handleAuthenticated = ({ scope }: { scope?: string }) => {
      setConnectionIssue('')
      setCanEdit(scope !== 'readonly')
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
      if (retrySaveTimerRef.current) {
        window.clearTimeout(retrySaveTimerRef.current)
      }
      provider.destroy()
    }
  }, [provider])

  const connected = connectionStatus === 'connected'

  const persistCurrentDraft = useCallback(() => {
    if (!editor || !canEdit) return null
    const draft = snapshotEditor(editor, title)
    writeLocalDraft(draftKey, draft)
    localDraftRef.current = draft
    hasUnsavedChangesRef.current = true
    return draft
  }, [canEdit, draftKey, editor, title])

  const clearDraft = useCallback(() => {
    removeLocalDraft(draftKey)
    localDraftRef.current = null
    hasUnsavedChangesRef.current = false
    setRecoverableDraft(null)
  }, [draftKey])

  const flushDraftKeepalive = useCallback(() => {
    if (!editor || !canEdit || !hasUnsavedChangesRef.current) return false
    const draft = persistCurrentDraft()
    if (!draft || draft.contentJson === lastVersionFingerprintRef.current || !navigator.onLine) return false
    return saveVersionKeepalive(docId, draft.contentJson, draft.snapshotHtml, draft.wordCount, draft.charCount, 'auto')
  }, [canEdit, docId, editor, persistCurrentDraft])

  const saveCurrentVersion = useCallback(async (source: SaveSource) => {
    if (!editor || !canEdit) return
    if (versionSavingRef.current) {
      queuedSaveSourceRef.current = source
      setVersionSaveState('saving')
      return
    }

    const draft = persistCurrentDraft()
    if (!draft) return

    if (draft.contentJson === lastVersionFingerprintRef.current) {
      clearDraft()
      setVersionSaveState('saved')
      setSaveIssue('')
      return
    }

    if (!navigator.onLine) {
      setVersionSaveState('local')
      setSaveIssue('网络不可用，恢复网络后会自动保存')
      return
    }

    versionSavingRef.current = true
    setVersionSaveState('saving')
    try {
      const result = await saveVersion(docId, draft.contentJson, draft.snapshotHtml, draft.wordCount, draft.charCount, source)
      lastVersionFingerprintRef.current = draft.contentJson
      clearDraft()
      setVersionSaveState(result?.saved === false ? 'idle' : 'saved')
      setSaveIssue('')
      setLastSavedAt(new Date())
      if (versionResetTimerRef.current) {
        window.clearTimeout(versionResetTimerRef.current)
      }
      versionResetTimerRef.current = window.setTimeout(() => setVersionSaveState('idle'), 2200)
    } catch {
      setVersionSaveState('error')
      setSaveIssue('保存未完成，稍后会自动重试')
      if (!retrySaveTimerRef.current) {
        retrySaveTimerRef.current = window.setTimeout(() => {
          retrySaveTimerRef.current = null
          void saveCurrentVersionRef.current('auto')
        }, 6000)
      }
    } finally {
      versionSavingRef.current = false
      const queuedSource = queuedSaveSourceRef.current
      queuedSaveSourceRef.current = null
      if (queuedSource) {
        window.setTimeout(() => void saveCurrentVersionRef.current(queuedSource), 0)
      }
    }
  }, [canEdit, clearDraft, docId, editor, persistCurrentDraft])

  useEffect(() => {
    saveCurrentVersionRef.current = saveCurrentVersion
  }, [saveCurrentVersion])

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
    if (!editor || !canEdit || contentRevision === 0) return
    const localTimer = window.setTimeout(() => {
      persistCurrentDraft()
      setVersionSaveState((state) => state === 'saving' ? state : 'saving')
    }, 300)
    const remoteTimer = window.setTimeout(() => {
      saveCurrentVersion('auto')
    }, 1600)
    return () => {
      window.clearTimeout(localTimer)
      window.clearTimeout(remoteTimer)
    }
  }, [canEdit, contentRevision, editor, persistCurrentDraft, saveCurrentVersion])

  useEffect(() => {
    if (!editor || !connected || bootstrappedVersionRef.current) return
    bootstrappedVersionRef.current = true
    const timer = window.setTimeout(() => {
      if (!editor.isEmpty) return
      listVersions(docId, 0, 1)
        .then((versions) => versions[0] ? getVersion(versions[0].id) : null)
        .then((version) => {
          if (!version || !editor.isEmpty) return
          editor.commands.setContent(JSON.parse(version.contentJson || '{}'))
          lastVersionFingerprintRef.current = version.contentJson || ''
          hasUnsavedChangesRef.current = false
        })
        .catch(() => {
          bootstrappedVersionRef.current = false
        })
    }, 900)
    return () => window.clearTimeout(timer)
  }, [connected, docId, editor])

  useEffect(() => {
    const handleOnline = () => {
      if (localDraftRef.current || readLocalDraft(draftKey)) {
        if (retrySaveTimerRef.current) {
          window.clearTimeout(retrySaveTimerRef.current)
          retrySaveTimerRef.current = null
        }
        void saveCurrentVersion('auto')
      }
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [draftKey, saveCurrentVersion])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!canEdit || !editor) return
      if (!hasUnsavedChangesRef.current && versionSaveState !== 'saving') return
      flushDraftKeepalive()
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [canEdit, editor, flushDraftKeepalive, versionSaveState])

  useEffect(() => {
    const handlePageHide = () => {
      flushDraftKeepalive()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushDraftKeepalive()
      }
    }
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [flushDraftKeepalive])

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

  const restoreLocalDraft = () => {
    if (!editor || !recoverableDraft || !canEdit) return
    try {
      editor.commands.setContent(JSON.parse(recoverableDraft.contentJson || '{}'))
      setTitle(recoverableDraft.title || title)
      setRecoverableDraft(null)
      hasUnsavedChangesRef.current = true
      window.setTimeout(() => void saveCurrentVersion('auto'), 300)
    } catch {
      setVersionSaveState('error')
    }
  }

  const discardLocalDraft = () => {
    clearDraft()
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
    if (!canEdit) return
    setTitle(nextTitle)
    if (nextTitle.trim()) {
      setTitleSaveState('saving')
    }
  }

  const closeDrawio = () => {
    setDrawioOpen(false)
    setActiveDiagram(null)
    setPendingDiagram(null)
  }

  const closeTemplatePicker = () => {
    setTemplatePickerOpen(false)
  }

  const selectDiagramTemplate = (template: DiagramTemplate, nextTitle: string) => {
    setPendingDiagram({
      xml: template.xml,
      title: nextTitle.trim() || template.name,
    })
    setTemplatePickerOpen(false)
    setDrawioOpen(true)
  }

  const saveDiagram = (value: DiagramAttrs) => {
    const payload = {
      ...value,
      title: value.title || activeDiagram?.attrs.title || pendingDiagram?.title || '图示',
      updatedAt: value.updatedAt || new Date().toISOString(),
    }
    if (activeDiagram) {
      activeDiagram.updateAttributes(payload)
    } else {
      editor?.chain().focus().insertContent([
        { type: 'diagram', attrs: payload },
        { type: 'paragraph' },
      ]).focus('end').run()
    }
    closeDrawio()
    setVersionSaveState('saving')
    window.setTimeout(() => void saveCurrentVersionRef.current('auto'), 300)
  }

  const uploadSelectedFile = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    target: 'image' | 'attachment'
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !editor || !canEdit || uploadingFile) return

    setUploadingFile(true)
    setVersionSaveState('saving')
    try {
      const uploaded = await uploadFile(file, docId)
      const attachmentAttrs: AttachmentAttrs = {
        objectName: uploaded.objectName,
        url: uploaded.url,
        name: uploaded.originalName || file.name,
        sizeBytes: uploaded.sizeBytes || file.size,
        contentType: uploaded.contentType || file.type,
        uploadedAt: new Date().toISOString(),
      }

      if (target === 'image' && (uploaded.contentType || file.type).startsWith('image/')) {
        editor.chain().focus().insertContent({
          type: 'image',
          attrs: {
            src: uploaded.url,
            alt: uploaded.originalName || file.name,
            title: uploaded.originalName || file.name,
            objectName: uploaded.objectName,
            contentType: uploaded.contentType || file.type,
            sizeBytes: uploaded.sizeBytes || file.size,
          },
        }).run()
      } else {
        editor.chain().focus().insertContent({ type: 'attachment', attrs: attachmentAttrs }).run()
      }

      setVersionSaveState('saving')
      window.setTimeout(() => void saveCurrentVersionRef.current('auto'), 300)
      message.success('文件已插入')
    } catch (error) {
      setVersionSaveState('error')
      setSaveIssue('上传失败，文档内容没有丢失')
      message.error(apiErrorMessage(error, '上传失败，请稍后重试'))
    } finally {
      setUploadingFile(false)
    }
  }, [canEdit, docId, editor, message, uploadingFile])

  const moreMenuItems = useMemo<MenuProps['items']>(() => [
    { key: 'find', label: '查找替换', icon: <SearchOutlined style={{ fontSize: 16 }} /> },
    ...(canEdit ? [{ key: 'diagram', label: '插入图示', icon: <PartitionOutlined style={{ fontSize: 16 }} /> }] : []),
    ...(canEdit ? [{
      key: 'image',
      label: uploadingFile ? '上传中...' : '上传图片',
      icon: uploadingFile ? <LoadingOutlined spin style={{ fontSize: 16 }} /> : <PictureOutlined style={{ fontSize: 16 }} />,
      disabled: uploadingFile,
    }] : []),
    ...(canEdit ? [{
      key: 'attachment',
      label: uploadingFile ? '上传中...' : '上传附件',
      icon: uploadingFile ? <LoadingOutlined spin style={{ fontSize: 16 }} /> : <PaperClipOutlined style={{ fontSize: 16 }} />,
      disabled: uploadingFile,
    }] : []),
    { key: 'versions', label: '历史版本', icon: <HistoryOutlined style={{ fontSize: 16 }} /> },
    { type: 'divider' },
    { key: 'mode', label: `切换为${mode === 'notion' ? '富文本' : '轻文档'}`, icon: <FileTextOutlined style={{ fontSize: 16 }} /> },
    { key: 'count', label: `字数 ${wordCount} 词 / ${charCount} 字`, icon: <FontSizeOutlined style={{ fontSize: 16 }} />, disabled: true },
    { type: 'divider' },
    { key: 'export', label: '导出 HTML', icon: <DownloadOutlined style={{ fontSize: 16 }} /> },
    ...(connectionStatus === 'disconnected'
      ? [{ key: 'reconnect', label: '重新连接协作', icon: <ReloadOutlined style={{ fontSize: 16 }} /> }]
      : []),
  ], [canEdit, charCount, connectionStatus, mode, uploadingFile, wordCount])

  const handleMoreMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'find') setFindOpen(true)
    if (key === 'diagram') openCreateDiagram()
    if (key === 'image') imageInputRef.current?.click()
    if (key === 'attachment') attachmentInputRef.current?.click()
    if (key === 'versions') navigate(`/doc/${docId}/versions`)
    if (key === 'mode') setMode(mode === 'notion' ? 'rich' : 'notion')
    if (key === 'export') exportHtml()
    if (key === 'reconnect') reconnectCollaboration()
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
              <ArrowLeftOutlined style={{ fontSize: 16 }} />
            </button>
            <input
              type="text"
              className="memorica-editor-title-input"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="无标题"
              disabled={!canEdit}
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
            <span className="memorica-editor-save-status" data-state={!canEdit ? 'readonly' : versionSaveState}>
              <span title={saveIssue || (lastSavedAt ? `上次保存 ${formatSavedAt(lastSavedAt)}` : undefined)}>
                {!canEdit ? '只读' : saveStateText(versionSaveState, saveIssue)}
                {shouldShowSavedAt(versionSaveState) && lastSavedAt ? ` ${formatSavedAt(lastSavedAt)}` : ''}
              </span>
            </span>
            {canEdit && versionSaveState === 'error' && (
              <button
                type="button"
                className="memorica-editor-sync-btn"
                onClick={() => saveCurrentVersion('manual')}
              >
                重试
              </button>
            )}
            {!connected && connectionStatus === 'disconnected' && (
              <button
                type="button"
                className="memorica-editor-icon-btn"
                onClick={reconnectCollaboration}
                title="重新连接"
              >
                <ReloadOutlined style={{ fontSize: 16 }} />
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
              <ShareAltOutlined style={{ fontSize: 16 }} />
              <span>分享</span>
            </button>
            <button
              type="button"
              className={aiOpen ? 'memorica-editor-btn active' : 'memorica-editor-btn'}
              onClick={() => setAiOpen(!aiOpen)}
              title="AI 助手"
              disabled={!canEdit}
            >
              <ThunderboltOutlined style={{ fontSize: 16 }} />
              <span className="hidden sm:inline">AI</span>
            </button>
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{ items: moreMenuItems, onClick: handleMoreMenuClick }}
            >
              <button type="button" className="memorica-editor-btn" title="更多">
                <EllipsisOutlined style={{ fontSize: 16 }} />
              </button>
            </Dropdown>
          </div>
        </div>
      </div>
      <input
        ref={imageInputRef}
        data-testid="memorica-image-upload"
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => void uploadSelectedFile(event, 'image')}
      />
      <input
        ref={attachmentInputRef}
        data-testid="memorica-attachment-upload"
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(event) => void uploadSelectedFile(event, 'attachment')}
      />
      {recoverableDraft && canEdit && (
        <div className="memorica-editor-draft-banner">
          <span>发现上次未保存的内容，更新时间 {new Date(recoverableDraft.updatedAt).toLocaleString()}</span>
          <button type="button" onClick={restoreLocalDraft}>恢复</button>
          <button type="button" onClick={discardLocalDraft}>忽略</button>
        </div>
      )}
      {mode === 'rich' && (
        <Toolbar
          editor={editor}
          onCreateDiagram={canEdit ? openCreateDiagram : undefined}
          onUploadImage={canEdit ? () => imageInputRef.current?.click() : undefined}
          onUploadAttachment={canEdit ? () => attachmentInputRef.current?.click() : undefined}
          uploading={uploadingFile}
        />
      )}
      <ShareSettingsPanel docId={docId} open={shareOpen} onClose={() => setShareOpen(false)} />
      <FindReplace editor={editor} open={findOpen} onClose={() => setFindOpen(false)} />
      <Modal
        title="重命名图示"
        open={Boolean(renameDiagram)}
        okText="保存名称"
        cancelText="取消"
        onCancel={() => setRenameDiagram(null)}
        onOk={() => {
          const nextTitle = renameDiagramTitle.trim() || '图示'
          renameDiagram?.updateAttributes({ title: nextTitle, updatedAt: new Date().toISOString() })
          setRenameDiagram(null)
          setVersionSaveState('saving')
          window.setTimeout(() => void saveCurrentVersionRef.current('auto'), 300)
        }}
      >
        <Input
          data-testid="memorica-diagram-rename-input"
          value={renameDiagramTitle}
          onChange={(event) => setRenameDiagramTitle(event.target.value)}
          maxLength={80}
        />
      </Modal>
      <Modal
        title="删除图示"
        open={Boolean(deleteDiagram)}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onCancel={() => setDeleteDiagram(null)}
        onOk={() => {
          deleteDiagram?.remove()
          setDeleteDiagram(null)
          setVersionSaveState('saving')
          window.setTimeout(() => void saveCurrentVersionRef.current('auto'), 300)
        }}
      >
        删除后会在下一次保存中写入版本历史。
      </Modal>
      <DiagramTemplatePicker
        open={templatePickerOpen}
        onCancel={closeTemplatePicker}
        onSelect={selectDiagramTemplate}
      />
      <DrawioDialog
        open={drawioOpen}
        initialXml={activeDiagram?.attrs.xml || pendingDiagram?.xml}
        initialTitle={activeDiagram?.attrs.title || pendingDiagram?.title || '图示'}
        onCancel={closeDrawio}
        onSave={saveDiagram}
      />
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
          {mode === 'notion' && <BubbleMenuBar editor={editor} onAskAI={canEdit ? () => setAiOpen(true) : undefined} />}
          <EditorContent editor={editor} />
          <SlashMenu
            editor={editor}
            onAskAI={canEdit ? (action) => { setAiInitialAction(action); setAiOpen(true) } : undefined}
            onCreateDiagram={canEdit ? openCreateDiagram : undefined}
            onUploadImage={canEdit ? () => imageInputRef.current?.click() : undefined}
            onUploadAttachment={canEdit ? () => attachmentInputRef.current?.click() : undefined}
          />
        </div>
      </div>
    </div>
  )
}
