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
import { Alert, Button, Card, Empty, List, Space, Spin, Tag, Typography } from 'antd'

const { Text, Title } = Typography

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
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
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
      setDetailLoading(false)
      setDetailError('')
      setLoadError('')
    } catch (error) {
      setVersions([])
      setSelectedVersion(null)
      setDetailLoading(false)
      setDetailError('')
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
        setDetailLoading(false)
        setDetailError('')
        setLoadError('')
      })
      .catch((error) => {
        if (cancelled) return
        setVersions([])
        setSelectedVersion(null)
        setDetailLoading(false)
        setDetailError('')
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
    setSelectedVersion(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const v = await getVersion(versionId)
      setSelectedVersion(v)
    } catch (error) {
      setDetailError(apiErrorMessage(error, '版本详情加载失败，请稍后重试'))
    } finally {
      setDetailLoading(false)
    }
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
        <Text type="secondary" className="text-sm">加载中...</Text>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Space size={8} align="center">
            <Button
              aria-label="返回编辑器"
              type="text"
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/doc/${docId}`)}
            />
            <FileTextOutlined className="text-blue-600" style={{ fontSize: 20 }} />
            <Text strong className="text-sm text-gray-900">{doc?.title || '文档'} - 历史版本</Text>
          </Space>
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
              <Text className="mb-3 block text-xs font-medium uppercase tracking-wider !text-gray-500">版本列表</Text>
              <List
                dataSource={versions}
                rowKey="id"
                split={false}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无历史版本"
                    />
                  ),
                }}
                renderItem={(v) => {
                  const delta = versionWordDelta(v, versions)
                  const active = selectedVersion?.id === v.id
                  return (
                    <List.Item className="!mb-2 !p-0">
                      <Button
                        block
                        type="text"
                        onClick={() => handleSelect(v.id)}
                        className={`!h-auto !justify-start !rounded-lg !border !p-3 !text-left ${
                          active
                            ? '!border-blue-300 !bg-blue-50'
                            : '!border-gray-100 !bg-white hover:!border-gray-200'
                      }`}
                        style={{ whiteSpace: 'normal' }}
                      >
                        <span className="flex w-full flex-col gap-2">
                          <span className="flex items-center justify-between gap-2">
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
                          </span>
                          <span className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <UserOutlined style={{ fontSize: 12 }} />
                              {v.editorName}
                            </span>
                            <span className="flex items-center gap-1">
                              <ClockCircleOutlined style={{ fontSize: 12 }} />
                              {formatDate(v.createdAt)}
                            </span>
                          </span>
                        </span>
                      </Button>
                    </List.Item>
                  )
                }}
              />
            </div>

            <div className="lg:col-span-2">
              {detailLoading ? (
                <Card className="border-gray-100 text-center" styles={{ body: { padding: 48 } }}>
                  <Space
                    direction="vertical"
                    align="center"
                    size={12}
                    data-testid="memorica-version-detail-loading"
                  >
                    <Spin />
                    <Text type="secondary">版本详情加载中...</Text>
                  </Space>
                </Card>
              ) : detailError ? (
                <Card className="border-gray-100" styles={{ body: { padding: 24 } }}>
                  <Alert
                    showIcon
                    type="error"
                    data-testid="memorica-version-detail-error"
                    message="版本详情加载失败"
                    description={detailError}
                  />
                </Card>
              ) : selectedVersion ? (
                <Card className="border-gray-100" styles={{ body: { padding: 24 } }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Title level={5} className="!mb-0 !text-sm !font-medium !text-gray-900">
                        版本 {selectedVersion.versionNumber}
                      </Title>
                      <Text type="secondary" className="mt-0.5 block text-xs">
                        {selectedVersion.editorName} · {formatDate(selectedVersion.createdAt)}
                      </Text>
                    </div>
                    {canRestore ? (
                      <Button
                        size="small"
                        icon={<RollbackOutlined />}
                        loading={restoring}
                        onClick={handleRestore}
                      >
                        恢复此版本
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        disabled
                        data-testid="memorica-version-restore-readonly"
                      >
                        只读用户不能恢复版本
                      </Button>
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
                </Card>
              ) : (
                <Card className="border-gray-100 text-center" styles={{ body: { padding: 48 } }}>
                  <Empty
                    image={<ClockCircleOutlined className="text-gray-200" style={{ fontSize: 40 }} />}
                    description="在左侧选择一个版本查看详情"
                  />
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
