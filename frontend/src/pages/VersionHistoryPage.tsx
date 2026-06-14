import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  apiErrorMessage,
  listVersions,
  getVersion,
  getDocument,
  type DocumentVersion,
  type DocumentVersionDetail,
  type DocumentItem,
} from '../api/client'
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  RollbackOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Alert, Button, Spin, Tag } from 'antd'

async function fetchHistory(docId: string) {
  const [doc, versions] = await Promise.all([getDocument(docId), listVersions(docId)])
  return { doc, versions: versions || [] }
}

function versionWordDelta(version: DocumentVersion, versions: DocumentVersion[]) {
  const ordered = [...versions].sort((a, b) => a.versionNumber - b.versionNumber)
  const index = ordered.findIndex((item) => item.id === version.id)
  const previous = index > 0 ? ordered[index - 1] : null
  if (!previous) return { text: '初始', color: 'default' }

  const delta = (version.wordCount || 0) - (previous.wordCount || 0)
  if (delta > 0) return { text: `+${delta} 词`, color: 'green' }
  if (delta < 0) return { text: `${delta} 词`, color: 'red' }
  return { text: '无变化', color: 'default' }
}

export default function VersionHistoryPage() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocumentItem | null>(null)
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [restoring, setRestoring] = useState(false)
  const canRestore = doc?.canWrite === true

  const loadHistory = useCallback(async () => {
    if (!docId) return
    try {
      const data = await fetchHistory(docId)
      setDoc(data.doc)
      setVersions(data.versions)
      setLoadError('')
    } catch (error) {
      setVersions([])
      setSelectedVersion(null)
      setLoadError(apiErrorMessage(error, '历史版本加载失败，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }, [docId])

  useEffect(() => {
    if (!docId) return
    let cancelled = false

    fetchHistory(docId)
      .then((data) => {
        if (cancelled) return
        setDoc(data.doc)
        setVersions(data.versions)
        setLoadError('')
      })
      .catch((error) => {
        if (cancelled) return
        setVersions([])
        setSelectedVersion(null)
        setLoadError(apiErrorMessage(error, '历史版本加载失败，请稍后重试'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [docId])

  const handleSelect = async (versionId: number) => {
    const v = await getVersion(versionId)
    setSelectedVersion(v)
  }

  const handleRestore = () => {
    if (!docId || !selectedVersion || restoring || !canRestore) return
    setRestoring(true)
    navigate(`/doc/${docId}?restoreVersion=${selectedVersion.id}`)
  }

  const formatDate = (s: string) => {
    if (!s) return ''
    const d = new Date(s)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <Spin />
        <span className="text-sm text-gray-400">加载中...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/doc/${docId}`)} className="p-1 hover:bg-gray-100 rounded-md transition">
              <ArrowLeftOutlined className="text-gray-500" style={{ fontSize: 16 }} />
            </button>
            <FileTextOutlined className="text-blue-600" style={{ fontSize: 20 }} />
            <span className="font-semibold text-gray-900 text-sm">{doc?.title || '文档'} — 历史版本</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loadError ? (
          <div data-testid="memorica-version-history-error">
            <Alert
              showIcon
              type="error"
              message="历史版本加载失败"
              description={loadError}
              action={(
                <Button
                  size="small"
                  data-testid="memorica-version-history-retry"
                  onClick={() => {
                    setLoading(true)
                    setLoadError('')
                    void loadHistory()
                  }}
                >
                  重试
                </Button>
              )}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">版本列表</h3>
              <div className="space-y-2">
                {versions.length === 0 && (
                  <p className="text-sm text-gray-400 py-4 text-center">暂无历史版本</p>
                )}
                {versions.map((v) => {
                  const delta = versionWordDelta(v, versions)
                  return (
                    <button
                      key={v.id}
                      onClick={() => handleSelect(v.id)}
                      className={`w-full text-left rounded-lg border p-3 transition ${
                        selectedVersion?.id === v.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-sm font-medium text-gray-900">版本 {v.versionNumber}</span>
                        <span className="flex items-center gap-2 text-xs text-gray-400">
                          {v.wordCount} 词
                          <Tag
                            bordered={false}
                            color={delta.color}
                            className="m-0 text-[11px]"
                            data-testid={`memorica-version-word-delta-${v.id}`}
                          >
                            {delta.text}
                          </Tag>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <UserOutlined style={{ fontSize: 12 }} />
                          {v.editorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockCircleOutlined style={{ fontSize: 12 }} />
                          {formatDate(v.createdAt)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedVersion ? (
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">版本 {selectedVersion.versionNumber}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {selectedVersion.editorName} · {formatDate(selectedVersion.createdAt)}
                      </p>
                    </div>
                    {canRestore ? (
                      <button
                        onClick={handleRestore}
                        disabled={restoring}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                      >
                        <RollbackOutlined style={{ fontSize: 14 }} />
                        {restoring ? '恢复中' : '恢复此版本'}
                      </button>
                    ) : (
                      <span
                        className="text-xs px-3 py-1.5 rounded-md border border-gray-100 bg-gray-50 text-gray-400"
                        data-testid="memorica-version-restore-readonly"
                      >
                        只读用户不能恢复版本
                      </span>
                    )}
                  </div>
                  {selectedVersion.snapshotHtml ? (
                    <div
                      className="prose prose-sm max-w-none prose-headings:font-semibold prose-p:my-2"
                      dangerouslySetInnerHTML={{ __html: selectedVersion.snapshotHtml }}
                    />
                  ) : (
                    <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 overflow-auto max-h-[600px]">
                      {JSON.stringify(JSON.parse(selectedVersion.contentJson || '{}'), null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                  <ClockCircleOutlined className="text-gray-200 mx-auto mb-3" style={{ fontSize: 40 }} />
                  <p className="text-sm text-gray-400">在左侧选择一个版本查看详情</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
