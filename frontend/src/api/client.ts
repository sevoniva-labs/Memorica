import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let refreshPromise: Promise<string | null> | null = null

export function apiErrorMessage(error: unknown, fallback: string) {
  const err = error as AxiosError<{ message?: string; error?: string }>
  if (!err.response) return '网络不可用，请检查连接后重试'
  return err.response.data?.message || fallback
}

function generateTraceId(): string {
  return Math.random().toString(36).substring(2, 10)
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Trace-Id'] = generateTraceId()
  return config
})

function clearSessionAndRedirect() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

async function refreshAccessTokenDirect() {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null

  try {
    const res = await axios.post(`${API_BASE}/api/v1/auth/refresh`, { refreshToken })
    const { accessToken, refreshToken: nextRefresh } = res.data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', nextRefresh)
    return accessToken as string
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (err.response?.status === 401) {
      const original = err.config as RetriableRequestConfig | undefined
      const url = original?.url || ''
      const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/refresh')

      if (original && !original._retry && !isAuthRequest) {
        original._retry = true
        refreshPromise = refreshPromise || refreshAccessTokenDirect().finally(() => {
          refreshPromise = null
        })
        const token = await refreshPromise
        if (token) {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        }
      }

      clearSessionAndRedirect()
    }
    return Promise.reject(err)
  }
)

export interface User {
  id: number
  username: string
  displayName: string
  email: string
  color: string
  avatar?: string
}

export interface DocumentItem {
  id: string
  title: string
  ownerName: string
  workspaceId?: string
  parentId?: string
  itemType?: 'document' | 'folder'
  wordCount: number
  charCount: number
  isPublic?: boolean
  isFavorite?: boolean
  canWrite?: boolean
  canManage?: boolean
  coverImage?: string
  createdAt: string
  updatedAt: string
  lastOpenedAt?: string
  deletedAt?: string
}

export interface DocumentVersion {
  id: number
  versionNumber: number
  editorName: string
  wordCount: number
  charCount: number
  createdAt: string
}

export interface DocumentVersionDetail extends DocumentVersion {
  contentJson: string
  snapshotHtml?: string
}

export interface AIGenerateRequest {
  action: string
  text: string
  customPrompt?: string
}

export interface AIGenerateResponse {
  provider: string
  model: string
  text: string
}

export interface UploadedFileInfo {
  objectName: string
  url: string
  originalName: string
  contentType: string
  sizeBytes: number
  documentId?: string
}

export interface DocumentSharingMember {
  userId: number
  username: string
  displayName: string
  email: string
  role: 'owner' | 'editor' | 'viewer'
  grantedAt: string
}

export interface DocumentSharing {
  documentId: string
  workspaceId?: string
  workspaceName?: string
  isPublic: boolean
  members: DocumentSharingMember[]
  workspaceMembers: WorkspaceMember[]
}

export interface DocumentAuditLog {
  id: number
  username: string
  action: string
  detail: string
  traceId?: string
  createdAt: string
}

export interface Workspace {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
  createdAt: string
}

export interface WorkspaceMember {
  userId: number
  username: string
  displayName: string
  email: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

interface PageResponse<T> {
  content: T[]
}

export async function login(username: string, password: string) {
  const res = await api.post('/auth/login', { username, password })
  return res.data.data
}

export async function register(username: string, password: string, email: string) {
  const res = await api.post('/auth/register', { username, password, email })
  return res.data.data
}

export async function getMe() {
  const res = await api.get('/auth/me')
  return res.data.data as User
}

export async function listMyDocuments(page = 0, size = 20, q?: string, parentId?: string) {
  const res = await api.get('/documents/my', { params: { page, size, q: q || undefined, parentId: parentId || undefined } })
  return (res.data.data as PageResponse<DocumentItem>).content
}

export async function listPublicDocuments(page = 0, size = 20, q?: string) {
  const res = await api.get('/documents/public', { params: { page, size, q: q || undefined } })
  return (res.data.data as PageResponse<DocumentItem>).content
}

export async function listSharedDocuments(page = 0, size = 20, q?: string) {
  const res = await api.get('/documents/shared', { params: { page, size, q: q || undefined } })
  return (res.data.data as PageResponse<DocumentItem>).content
}

export async function listWorkspaceDocuments(workspaceId: string, page = 0, size = 20, q?: string, parentId?: string) {
  const res = await api.get(`/documents/workspace/${workspaceId}`, { params: { page, size, q: q || undefined, parentId: parentId || undefined } })
  return (res.data.data as PageResponse<DocumentItem>).content
}

export async function listWorkspaceFolders(workspaceId: string) {
  const res = await api.get(`/documents/workspace/${workspaceId}/folders`)
  return res.data.data as DocumentItem[]
}

export async function listRecentDocuments(page = 0, size = 20) {
  const res = await api.get('/documents/recent', { params: { page, size } })
  return (res.data.data as PageResponse<DocumentItem>).content
}

export async function listFavoriteDocuments(page = 0, size = 20) {
  const res = await api.get('/documents/favorites', { params: { page, size } })
  return (res.data.data as PageResponse<DocumentItem>).content
}

export async function listTrashDocuments(page = 0, size = 20) {
  const res = await api.get('/documents/trash', { params: { page, size } })
  return (res.data.data as PageResponse<DocumentItem>).content
}

export async function createDocument(title?: string, workspaceId?: string, parentId?: string) {
  const res = await api.post('/documents', { title: title || '未命名文档', workspaceId, parentId })
  return res.data.data as DocumentItem
}

export async function createFolder(title: string, workspaceId?: string, parentId?: string) {
  const res = await api.post('/documents/folders', { title, workspaceId, parentId })
  return res.data.data as DocumentItem
}

export async function getDocument(id: string) {
  const res = await api.get(`/documents/${id}`)
  return res.data.data as DocumentItem
}

export async function updateDocumentMeta(id: string, title?: string, isPublic?: boolean) {
  const res = await api.put(`/documents/${id}`, { title, isPublic })
  return res.data.data as DocumentItem
}

export async function moveDocument(id: string, parentId?: string | null) {
  const res = await api.put(`/documents/${id}/move`, { parentId: parentId || null })
  return res.data.data as DocumentItem
}

export async function getDocumentSharing(id: string) {
  const res = await api.get(`/documents/${id}/sharing`)
  return res.data.data as DocumentSharing
}

export async function setDocumentPublic(id: string, isPublic: boolean) {
  await updateDocumentMeta(id, undefined, isPublic)
  return getDocumentSharing(id)
}

export async function grantDocumentAccess(id: string, username: string, role: 'editor' | 'viewer') {
  const res = await api.post(`/documents/${id}/sharing/members`, { username, role })
  return res.data.data as DocumentSharing
}

export async function revokeDocumentAccess(id: string, userId: number) {
  const res = await api.delete(`/documents/${id}/sharing/members/${userId}`)
  return res.data.data as DocumentSharing
}

export async function listDocumentAudit(id: string, page = 0, size = 20) {
  const res = await api.get(`/documents/${id}/audit`, { params: { page, size } })
  return (res.data.data as PageResponse<DocumentAuditLog>).content
}

export async function listWorkspaces() {
  const res = await api.get('/workspaces')
  return res.data.data as Workspace[]
}

export async function listWorkspaceMembers(workspaceId: string) {
  const res = await api.get(`/workspaces/${workspaceId}/members`)
  return res.data.data as WorkspaceMember[]
}

export async function inviteWorkspaceMember(workspaceId: string, username: string, role: 'admin' | 'member') {
  const res = await api.post(`/workspaces/${workspaceId}/members`, { username, role })
  return res.data.data as WorkspaceMember[]
}

export async function removeWorkspaceMember(workspaceId: string, userId: number) {
  const res = await api.delete(`/workspaces/${workspaceId}/members/${userId}`)
  return res.data.data as WorkspaceMember[]
}

export async function deleteDocument(id: string) {
  await api.delete(`/documents/${id}`)
}

export async function restoreDocument(id: string) {
  const res = await api.post(`/documents/${id}/restore`)
  return res.data.data as DocumentItem
}

export async function setDocumentFavorite(id: string, favorite: boolean) {
  const res = await api.put(`/documents/${id}/favorite`, null, { params: { favorite } })
  return res.data.data as DocumentItem
}

export async function saveVersion(
  id: string,
  contentJson: string,
  snapshotHtml: string,
  wordCount: number,
  charCount: number,
  source: 'manual' | 'auto' | 'restore' = 'manual'
) {
  const res = await api.post(`/documents/${id}/versions`, {
    contentJson,
    snapshotHtml,
    wordCount,
    charCount,
    source,
  })
  return res.data.data
}

export function saveVersionKeepalive(
  id: string,
  contentJson: string,
  snapshotHtml: string,
  wordCount: number,
  charCount: number,
  source: 'manual' | 'auto' | 'restore' = 'auto'
) {
  const token = localStorage.getItem('accessToken')
  if (!token) return false

  const body = JSON.stringify({
    contentJson,
    snapshotHtml,
    wordCount,
    charCount,
    source,
  })
  if (new Blob([body]).size > 60 * 1024) return false

  void fetch(`${API_BASE}/api/v1/documents/${id}/versions`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Trace-Id': generateTraceId(),
    },
    body,
  }).catch(() => undefined)
  return true
}

export async function listVersions(id: string, page = 0, size = 20) {
  const res = await api.get(`/documents/${id}/versions`, { params: { page, size } })
  return (res.data.data as PageResponse<DocumentVersion>).content
}

export async function getVersion(versionId: number) {
  const res = await api.get(`/documents/versions/${versionId}`)
  return res.data.data as DocumentVersionDetail
}

export async function generateAI(request: AIGenerateRequest) {
  const res = await api.post('/ai/generate', request)
  return res.data.data as AIGenerateResponse
}

export async function uploadFile(file: File, documentId?: string) {
  const form = new FormData()
  form.append('file', file)
  if (documentId) {
    form.append('documentId', documentId)
  }
  const res = await api.post('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data as UploadedFileInfo
}

export async function getFileUrl(objectName: string) {
  const res = await api.get(`/files/view/${encodeURIComponent(objectName)}`)
  return res.data.data as UploadedFileInfo
}
