import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMyDocuments, listPublicDocuments, createDocument, deleteDocument, type DocumentItem } from '../api/client'
import { FileText, Plus, Trash2, Clock, Globe, Lock, LogOut } from 'lucide-react'

export default function DocumentListPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [tab, setTab] = useState<'my' | 'public'>('my')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const fetch = async () => {
    setLoading(true)
    try {
      const data = tab === 'my' ? await listMyDocuments() : await listPublicDocuments()
      setDocs(data || [])
    } catch {
      setDocs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
  }, [tab])

  const handleCreate = async () => {
    const doc = await createDocument('未命名文档')
    navigate(`/doc/${doc.id}`)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定删除此文档？')) return
    await deleteDocument(id)
    fetch()
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const formatDate = (s: string) => {
    if (!s) return ''
    const d = new Date(s)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900 text-sm">协同文档</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{user.displayName || user.username}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab('my')}
              className={`px-3 py-1.5 text-xs rounded-md transition ${tab === 'my' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              我的文档
            </button>
            <button
              onClick={() => setTab('public')}
              className={`px-3 py-1.5 text-xs rounded-md transition ${tab === 'public' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              公开文档
            </button>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg px-4 py-2 hover:bg-blue-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            新建文档
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-xs text-gray-400">加载中...</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {tab === 'my' ? '暂无文档，点击右上角创建' : '暂无公开文档'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/doc/${doc.id}`)}
                className="group bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  {tab === 'my' && (
                    <button
                      onClick={(e) => handleDelete(doc.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1 truncate">{doc.title}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(doc.updatedAt || doc.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    {tab === 'public' ? (
                      <>
                        <Globe className="w-3 h-3" />
                        {doc.ownerName}
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        {doc.wordCount} 词
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
