import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import CollabEditor from '../components/CollabEditor'
import { getDocument, type DocumentItem } from '../api/client'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useAuthStore } from '../stores/authStore'

export default function EditorPage() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocumentItem | null>(null)
  const [loading, setLoading] = useState(true)

  const user = useAuthStore((s) => s.user)

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
        <Button
          type="link"
          icon={<ArrowLeftOutlined style={{ fontSize: 14 }} />}
          onClick={() => navigate('/')}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          返回文档列表
        </Button>
      </div>
    )
  }

  return (
    <CollabEditor
      key={docId}
      docId={docId!}
      userName={user?.displayName || user?.username || '匿名用户'}
      userColor={user?.color || '#2563eb'}
      initialTitle={doc.title}
      initialCanWrite={doc.canWrite !== false}
      initialCanManage={doc.canManage === true}
    />
  )
}
