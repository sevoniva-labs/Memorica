import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
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
  wordCount: number
  charCount: number
  coverImage?: string
  createdAt: string
  updatedAt: string
}

export interface DocumentVersion {
  id: number
  versionNumber: number
  editorName: string
  wordCount: number
  charCount: number
  createdAt: string
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

export async function listMyDocuments() {
  const res = await api.get('/documents/my')
  return res.data.data as DocumentItem[]
}

export async function listPublicDocuments() {
  const res = await api.get('/documents/public')
  return res.data.data as DocumentItem[]
}

export async function createDocument(title?: string) {
  const res = await api.post('/documents', { title: title || '未命名文档' })
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

export async function deleteDocument(id: string) {
  await api.delete(`/documents/${id}`)
}

export async function saveVersion(
  id: string,
  contentJson: string,
  snapshotHtml: string,
  wordCount: number,
  charCount: number
) {
  const res = await api.post(`/documents/${id}/versions`, {
    contentJson,
    snapshotHtml,
    wordCount,
    charCount,
  })
  return res.data.data
}

export async function listVersions(id: string) {
  const res = await api.get(`/documents/${id}/versions`)
  return res.data.data as DocumentVersion[]
}

export async function getVersion(versionId: number) {
  const res = await api.get(`/documents/versions/${versionId}`)
  return res.data.data
}

export async function uploadFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data as { objectName: string; url: string }
}
