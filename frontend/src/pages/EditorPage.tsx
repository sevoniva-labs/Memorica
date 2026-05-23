import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import CollabEditor from '../components/CollabEditor'
import { getDocument, type DocumentItem } from '../api/client'
import { ArrowLeft } from 'lucide-react'

export default function EditorPage() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocumentItem | null>(null)
  const [loading, setLoading] = useState(true)

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    if (!docId) return
    getDocument(docId)
      .then(setDoc)
      .catch(() => setDoc(null))
      .finally(() => setLoading(false))
  }, [docId])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="text-sm text-gray-400">加载中...</span>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-500">文档不存在或无权访问</p>
        <button
          onClick={() => navigate('/')}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回文档列表
        </button>
      </div>
    )
  }

  return (
    <CollabEditor
      docId={docId!}
      userName={user.displayName || user.username || '匿名用户'}
      userColor={user.color || '#2563eb'}
      initialTitle={doc.title}
    />
  )
}
