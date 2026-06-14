import { useCallback, useEffect, useState } from 'react'
import {
  getDocumentSharing,
  grantDocumentAccess,
  listDocumentAudit,
  revokeDocumentAccess,
  setDocumentPublic,
  type DocumentAuditLog,
  type DocumentSharing,
  type WorkspaceMember,
} from '../api/client'
import {
  BankOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  GlobalOutlined,
  LockOutlined,
  SafetyOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Alert, Button, Drawer, Input, List, Select, Space, Spin, Switch, Tag, Typography } from 'antd'

const { Text, Title } = Typography
const shareRoleOptions = [
  { value: 'viewer', label: '可查看' },
  { value: 'editor', label: '可编辑' },
]

interface Props {
  docId: string
  open: boolean
  onClose: () => void
}

function formatDate(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function roleLabel(role: string) {
  if (role === 'owner') return '所有者'
  if (role === 'editor') return '可编辑'
  return '可查看'
}

function workspaceRoleLabel(role: WorkspaceMember['role']) {
  if (role === 'owner') return '空间所有者'
  if (role === 'admin') return '空间管理员'
  return '空间成员'
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message || fallback
  }
  return fallback
}

export default function ShareSettingsPanel({ docId, open, onClose }: Props) {
  const [sharing, setSharing] = useState<DocumentSharing | null>(null)
  const [auditLogs, setAuditLogs] = useState<DocumentAuditLog[]>([])
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadSharing = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextSharing, logs] = await Promise.all([getDocumentSharing(docId), listDocumentAudit(docId)])
      setSharing(nextSharing)
      setAuditLogs(logs)
    } catch (err) {
      setError(errorMessage(err, '分享设置加载失败'))
    } finally {
      setLoading(false)
    }
  }, [docId])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      loadSharing()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadSharing, open])

  const updatePublic = async (isPublic: boolean) => {
    setSaving(true)
    setError('')
    try {
      setSharing(await setDocumentPublic(docId, isPublic))
      setAuditLogs(await listDocumentAudit(docId))
    } catch (err) {
      setError(errorMessage(err, '公开设置保存失败'))
    } finally {
      setSaving(false)
    }
  }

  const grantAccess = async () => {
    const value = username.trim()
    if (!value) return
    setSaving(true)
    setError('')
    try {
      setSharing(await grantDocumentAccess(docId, value, role))
      setAuditLogs(await listDocumentAudit(docId))
      setUsername('')
    } catch (err) {
      setError(errorMessage(err, '添加协作者失败'))
    } finally {
      setSaving(false)
    }
  }

  const revokeAccess = async (userId: number) => {
    setSaving(true)
    setError('')
    try {
      setSharing(await revokeDocumentAccess(docId, userId))
      setAuditLogs(await listDocumentAudit(docId))
    } catch (err) {
      setError(errorMessage(err, '移除协作者失败'))
    } finally {
      setSaving(false)
    }
  }

  const drawerTitle = (
    <div>
      <Text type="secondary" className="memorica-share-kicker">协作设置</Text>
      <Title level={4} className="memorica-share-title">分享与权限</Title>
    </div>
  )

  return (
    <Drawer
      className="memorica-share-panel"
      closeIcon={<CloseOutlined />}
      destroyOnHidden
      open={open}
      onClose={onClose}
      rootClassName="memorica-share-drawer"
      title={drawerTitle}
      width="min(460px, 100vw)"
      styles={{ body: { padding: 0 } }}
    >
      {loading ? (
        <div className="memorica-share-loading">
          <Spin size="small" />
          <Text type="secondary">加载权限配置</Text>
        </div>
      ) : (
        <>
          {error && <Alert className="memorica-share-error" showIcon type="error" message={error} />}

          <section className="memorica-share-section">
            <div className="memorica-share-section-title">
              {sharing?.isPublic ? <GlobalOutlined style={{ fontSize: 18 }} /> : <LockOutlined style={{ fontSize: 18 }} />}
              <div>
                <strong>{sharing?.isPublic ? '公开文档' : '私密文档'}</strong>
                <span>
                  {sharing?.isPublic
                    ? '登录用户可查看，编辑仍需授权。'
                    : '空间成员可查看；空间管理员和文档编辑者可编辑。'}
                </span>
              </div>
            </div>
            <Space size={8}>
              <Tag bordered={false} color={sharing?.isPublic ? 'blue' : 'default'}>
                {sharing?.isPublic ? '已公开' : '未公开'}
              </Tag>
              <Switch
                aria-label="切换公开访问"
                checked={sharing?.isPublic === true}
                checkedChildren={<CheckOutlined />}
                disabled={saving}
                loading={saving}
                onChange={updatePublic}
                unCheckedChildren={<LockOutlined />}
              />
            </Space>
          </section>

          <section className="memorica-share-section vertical">
            <div className="memorica-share-section-title">
              <TeamOutlined style={{ fontSize: 18 }} />
              <div>
                <strong>添加协作者</strong>
                <span>输入用户名或邮箱，授予查看或编辑权限。</span>
              </div>
            </div>
            <div className="memorica-share-form">
              <Input
                data-testid="memorica-share-username"
                disabled={saving}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                onPressEnter={grantAccess}
                placeholder="username 或 email"
              />
              <Select
                value={role}
                disabled={saving}
                onChange={setRole}
                options={shareRoleOptions}
              />
              <Button
                data-testid="memorica-share-add-member"
                disabled={!username.trim()}
                loading={saving}
                onClick={grantAccess}
                type="primary"
              >
                添加
              </Button>
            </div>
          </section>

          <section className="memorica-share-section vertical">
            <div className="memorica-share-section-title">
              <BankOutlined style={{ fontSize: 18 }} />
              <div>
                <strong>空间访问</strong>
                <span>
                  {sharing?.workspaceName || '当前空间'} 内 {sharing?.workspaceMembers?.length || 0} 个成员默认可查看，管理员可编辑。
                </span>
              </div>
            </div>
            <List
              className="memorica-share-members"
              data-testid="memorica-share-workspace-members"
              dataSource={sharing?.workspaceMembers || []}
              locale={{ emptyText: '暂无空间成员' }}
              renderItem={(member) => (
                <List.Item
                  className="memorica-share-member workspace"
                  actions={[
                    <Tag bordered={false} color="blue" key="workspace-role">{workspaceRoleLabel(member.role)}</Tag>,
                    <Tag bordered={false} color={member.role === 'owner' || member.role === 'admin' ? 'green' : 'default'} key="workspace-access">
                      {member.role === 'owner' || member.role === 'admin' ? '可编辑' : '可查看'}
                    </Tag>,
                  ]}
                >
                  <List.Item.Meta
                    title={member.displayName || member.username}
                    description={member.email || member.username}
                  />
                </List.Item>
              )}
            />
          </section>

          <section className="memorica-share-section vertical">
            <div className="memorica-share-section-title">
              <SafetyOutlined style={{ fontSize: 18 }} />
              <div>
                <strong>单文档授权</strong>
                <span>{sharing?.members.length || 0} 个成员拥有文档级权限，可单独授予编辑能力。</span>
              </div>
            </div>
            <List
              className="memorica-share-members"
              data-testid="memorica-share-document-members"
              dataSource={sharing?.members || []}
              locale={{ emptyText: '暂无文档级授权' }}
              renderItem={(member) => {
                const actions = [
                  <Tag bordered={false} color={member.role === 'owner' ? 'gold' : 'blue'} key="document-role">
                    {roleLabel(member.role)}
                  </Tag>,
                ]
                if (member.role !== 'owner') {
                  actions.push(
                    <Button
                      aria-label="移除协作者"
                      disabled={saving}
                      icon={<DeleteOutlined />}
                      key="revoke"
                      onClick={() => revokeAccess(member.userId)}
                      size="small"
                      type="text"
                    />,
                  )
                }
                return (
                  <List.Item className="memorica-share-member" actions={actions}>
                    <List.Item.Meta
                      title={member.displayName || member.username}
                      description={member.email || member.username}
                    />
                  </List.Item>
                )
              }}
            />
          </section>

          <section className="memorica-share-section vertical">
            <div className="memorica-share-section-title">
              <SafetyOutlined style={{ fontSize: 18 }} />
              <div>
                <strong>最近审计</strong>
                <span>分享、保存和删除等关键操作会留痕。</span>
              </div>
            </div>
            <List
              className="memorica-audit-list"
              dataSource={auditLogs}
              locale={{ emptyText: '暂无审计记录' }}
              renderItem={(log) => (
                <List.Item className="memorica-audit-item">
                  <Text type="secondary">{formatDate(log.createdAt)}</Text>
                  <Text strong>{log.action}</Text>
                  <Text type="secondary">{log.username}</Text>
                </List.Item>
              )}
            />
          </section>
        </>
      )}
    </Drawer>
  )
}
