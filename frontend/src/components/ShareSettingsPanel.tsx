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
  LoadingOutlined,
  LockOutlined,
  SafetyOutlined,
  TeamOutlined,
} from '@ant-design/icons'

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

  if (!open) return null

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

  return (
    <div className="memorica-share-overlay" onMouseDown={onClose}>
      <aside className="memorica-share-panel" onMouseDown={(event) => event.stopPropagation()}>
        <header className="memorica-share-head">
          <div>
            <span className="memorica-share-kicker">协作设置</span>
            <h2>分享与权限</h2>
          </div>
          <button onClick={onClose} aria-label="关闭分享设置">
            <CloseOutlined style={{ fontSize: 18 }} />
          </button>
        </header>

        {loading ? (
          <div className="memorica-share-loading">
            <LoadingOutlined spin style={{ fontSize: 18 }} />
            加载权限配置
          </div>
        ) : (
          <>
            {error && <div className="memorica-share-error">{error}</div>}

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
              <button
                className={sharing?.isPublic ? 'memorica-share-toggle active' : 'memorica-share-toggle'}
                disabled={saving}
                onClick={() => updatePublic(!sharing?.isPublic)}
              >
                {sharing?.isPublic ? <CheckOutlined style={{ fontSize: 15 }} /> : null}
                {sharing?.isPublic ? '已公开' : '设为公开'}
              </button>
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
                <input
                  data-testid="memorica-share-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="username 或 email"
                />
                <select value={role} onChange={(event) => setRole(event.target.value as 'viewer' | 'editor')}>
                  <option value="viewer">可查看</option>
                  <option value="editor">可编辑</option>
                </select>
                <button
                  data-testid="memorica-share-add-member"
                  disabled={saving || !username.trim()}
                  onClick={grantAccess}
                >
                  添加
                </button>
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
              <div className="memorica-share-members" data-testid="memorica-share-workspace-members">
                {sharing?.workspaceMembers?.map((member) => (
                  <div className="memorica-share-member workspace" key={member.userId}>
                    <div>
                      <strong>{member.displayName || member.username}</strong>
                      <span>{member.email || member.username}</span>
                    </div>
                    <em>{workspaceRoleLabel(member.role)}</em>
                    <span className="memorica-share-member-note">
                      {member.role === 'owner' || member.role === 'admin' ? '可编辑' : '可查看'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="memorica-share-section vertical">
              <div className="memorica-share-section-title">
                <SafetyOutlined style={{ fontSize: 18 }} />
                <div>
                  <strong>单文档授权</strong>
                  <span>{sharing?.members.length || 0} 个成员拥有文档级权限，可单独授予编辑能力。</span>
                </div>
              </div>
              <div className="memorica-share-members" data-testid="memorica-share-document-members">
                {sharing?.members.map((member) => (
                  <div className="memorica-share-member" key={member.userId}>
                    <div>
                      <strong>{member.displayName || member.username}</strong>
                      <span>{member.email || member.username}</span>
                    </div>
                    <em>{roleLabel(member.role)}</em>
                    {member.role !== 'owner' && (
                      <button disabled={saving} onClick={() => revokeAccess(member.userId)} aria-label="移除协作者">
                        <DeleteOutlined style={{ fontSize: 15 }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="memorica-share-section vertical">
              <div className="memorica-share-section-title">
                <SafetyOutlined style={{ fontSize: 18 }} />
                <div>
                  <strong>最近审计</strong>
                  <span>分享、保存和删除等关键操作会留痕。</span>
                </div>
              </div>
              <div className="memorica-audit-list">
                {auditLogs.map((log) => (
                  <div className="memorica-audit-item" key={log.id}>
                    <span>{formatDate(log.createdAt)}</span>
                    <strong>{log.action}</strong>
                    <em>{log.username}</em>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </aside>
    </div>
  )
}
