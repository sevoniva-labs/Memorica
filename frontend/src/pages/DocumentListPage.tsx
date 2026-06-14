import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App as AntdApp,
  Avatar,
  Button,
  Dropdown,
  Input,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Typography,
} from 'antd'
import type { MenuProps } from 'antd'
import { ProTable, type ProColumns } from '@ant-design/pro-components'
import {
  BellOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FileOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SearchOutlined,
  SnippetsOutlined,
  StarFilled,
  StarOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import {
  createFolder,
  createDocument,
  deleteDocument,
  listFavoriteDocuments,
  listMyDocuments,
  listPublicDocuments,
  listRecentDocuments,
  listSharedDocuments,
  listTrashDocuments,
  listWorkspaceDocuments,
  listWorkspaceFolders,
  listWorkspaces,
  moveDocument,
  restoreDocument,
  setDocumentFavorite,
  updateDocumentMeta,
  type DocumentItem,
} from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { useSidebar } from '../contexts/SidebarContext'

const { Text, Title } = Typography

type TabKey = 'workspace' | 'my' | 'recent' | 'favorite' | 'shared' | 'public' | 'trash'

interface WorkspaceRow extends DocumentItem {
  key: string
}

function formatDate(value: string) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  if (diffDay < 7) return `${diffDay} 天前`

  const sameYear = date.getFullYear() === now.getFullYear()
  return sameYear
    ? `${date.getMonth() + 1}月${date.getDate()}日`
    : `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function initials(name?: string) {
  const value = name?.trim() || 'U'
  return value.slice(0, 1).toUpperCase()
}

async function loadDocuments(tab: TabKey, workspaceId?: string, query = '', parentId?: string) {
  const keyword = query.trim()
  if (tab === 'workspace') {
    if (!workspaceId) return []
    return listWorkspaceDocuments(workspaceId, 0, 20, keyword, parentId)
  }
  if (tab === 'my') return listMyDocuments(0, 20, keyword, parentId)
  if (tab === 'shared') return listSharedDocuments(0, 20, keyword)
  if (tab === 'public') return listPublicDocuments(0, 20, keyword)
  if (tab === 'recent') return listRecentDocuments(0, 20)
  if (tab === 'favorite') return listFavoriteDocuments(0, 20)
  return listTrashDocuments(0, 20)
}

export default function DocumentListPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>()
  const [tab, setTab] = useState<TabKey>('workspace')
  const { query, setQuery } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [folderStack, setFolderStack] = useState<DocumentItem[]>([])
  const [folderModalVisible, setFolderModalVisible] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [activeRecord, setActiveRecord] = useState<DocumentItem>()
  const [renameVisible, setRenameVisible] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [moveVisible, setMoveVisible] = useState(false)
  const [moveTargetId, setMoveTargetId] = useState('')
  const [folderOptions, setFolderOptions] = useState<DocumentItem[]>([])
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { message } = AntdApp.useApp()

  const displayName = user?.displayName || user?.username || '用户'
  const currentFolder = folderStack[folderStack.length - 1]
  const currentParentId = currentFolder?.id
  const canUseFolders = tab === 'workspace' || tab === 'my'

  const fetchDocuments = async (
    nextTab = tab,
    workspaceId = activeWorkspaceId,
    nextQuery = query,
    nextParentId = currentParentId
  ) => {
    if (nextTab === 'workspace' && !workspaceId) {
      setDocs([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await loadDocuments(nextTab, workspaceId, nextQuery, nextParentId)
      setDocs(data)
    } catch {
      setDocs([])
      message.error('文档列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'workspace' && !activeWorkspaceId) {
      return
    }
    let cancelled = false
    let loadingTimer: ReturnType<typeof setTimeout> | null = null

    loadingTimer = setTimeout(() => {
      if (!cancelled) setLoading(true)
    }, 120)

    const request = loadDocuments(tab, activeWorkspaceId, query, currentParentId)
    request
      .then((data) => {
        if (!cancelled) setDocs(data)
      })
      .catch(() => {
        if (!cancelled) {
          setDocs([])
          message.error('文档列表加载失败')
        }
      })
      .finally(() => {
        if (!cancelled) {
          if (loadingTimer) clearTimeout(loadingTimer)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
      if (loadingTimer) clearTimeout(loadingTimer)
    }
  }, [tab, activeWorkspaceId, query, currentParentId, message])

  useEffect(() => {
    let cancelled = false
    listWorkspaces()
      .then((data) => {
        if (cancelled) return
        setActiveWorkspaceId((current) => current || data[0]?.id)
      })
      .catch(() => {
        if (!cancelled) message.error('空间信息加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [message])

  const rows = useMemo<WorkspaceRow[]>(() => {
    const normalized = query.trim().toLowerCase()
    return docs
      .filter((doc) => !normalized || doc.title.toLowerCase().includes(normalized))
      .map((doc) => ({ ...doc, key: doc.id }))
  }, [docs, query])

  const handleCreate = async (title = '未命名文档') => {
    try {
      const doc = await createDocument(title, activeWorkspaceId, canUseFolders ? currentParentId : undefined)
      navigate(`/doc/${doc.id}`)
    } catch {
      message.error('创建文档失败')
    }
  }

  const handleCreateFolder = async () => {
    const title = folderName.trim()
    if (!title) return
    try {
      await createFolder(title, activeWorkspaceId, currentParentId)
      setFolderModalVisible(false)
      setFolderName('')
      message.success('文件夹已创建')
      fetchDocuments()
    } catch {
      message.error('创建文件夹失败')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id)
      message.success('文档已删除')
      fetchDocuments()
    } catch {
      message.error('删除失败')
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await restoreDocument(id)
      message.success('文档已恢复')
      fetchDocuments()
    } catch {
      message.error('恢复失败')
    }
  }

  const handleFavorite = async (record: DocumentItem) => {
    try {
      const next = await setDocumentFavorite(record.id, !record.isFavorite)
      setDocs((items) => items.map((item) => (item.id === record.id ? { ...item, isFavorite: next.isFavorite } : item)))
      if (tab === 'favorite' && record.isFavorite) {
        setDocs((items) => items.filter((item) => item.id !== record.id))
      }
    } catch {
      message.error('收藏状态更新失败')
    }
  }

  const openRename = (record: DocumentItem) => {
    setActiveRecord(record)
    setRenameValue(record.title)
    setRenameVisible(true)
  }

  const handleRename = async () => {
    if (!activeRecord || !renameValue.trim()) return
    try {
      await updateDocumentMeta(activeRecord.id, renameValue.trim())
      setRenameVisible(false)
      setActiveRecord(undefined)
      message.success('名称已更新')
      fetchDocuments()
    } catch {
      message.error('重命名失败')
    }
  }

  const openMove = async (record: DocumentItem) => {
    if (!activeWorkspaceId) return
    setActiveRecord(record)
    setMoveTargetId(record.parentId || '')
    setMoveVisible(true)
    try {
      const folders = await listWorkspaceFolders(activeWorkspaceId)
      setFolderOptions(folders.filter((folder) => folder.id !== record.id))
    } catch {
      setFolderOptions([])
      message.error('文件夹列表加载失败')
    }
  }

  const handleMove = async () => {
    if (!activeRecord) return
    try {
      await moveDocument(activeRecord.id, moveTargetId || null)
      setMoveVisible(false)
      setActiveRecord(undefined)
      message.success('已移动')
      fetchDocuments()
    } catch {
      message.error('移动失败')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const switchTab = (nextTab: TabKey) => {
    if (nextTab === tab) return
    setFolderStack([])
    setQuery('')
    setTab(nextTab)
  }

  const enterFolder = (folder: DocumentItem) => {
    setFolderStack((items) => [...items, folder])
    setQuery('')
    setLoading(true)
  }

  const jumpToFolder = (index: number) => {
    setFolderStack((items) => items.slice(0, index + 1))
    setQuery('')
    setLoading(true)
  }

  const jumpToRoot = () => {
    setFolderStack([])
    setQuery('')
    setLoading(true)
  }

  const columns: ProColumns<WorkspaceRow>[] = [
    {
      title: '名称',
      dataIndex: 'title',
      render: (_, record) => (
        <Space align="center" size={10} className="memorica-doc-title">
          <span className={`memorica-file-icon ${record.itemType === 'folder' ? 'folder' : 'doc'}`}>
            {record.itemType === 'folder' ? <FolderOpenOutlined /> : <FileOutlined />}
          </span>
          <span className="memorica-title-copy">
            <Text strong ellipsis={{ tooltip: record.title }} className="memorica-title-text">
              {record.title}
            </Text>
            <Text type="secondary" className="memorica-mobile-date">
              {formatDate(record.updatedAt || record.createdAt)}
            </Text>
          </span>
        </Space>
      ),
    },
    {
      title: '创建人',
      dataIndex: 'ownerName',
      className: 'memorica-owner-column',
      width: 140,
      render: (_, record) => (
        <Space align="center" size={6}>
          <Avatar size={22}>{initials(record.ownerName || displayName)}</Avatar>
          <Text type="secondary" ellipsis={{ tooltip: record.ownerName || displayName }}>
            {record.ownerName || displayName}
          </Text>
        </Space>
      ),
    },
    {
      title: '最近更新',
      dataIndex: 'updatedAt',
      className: 'memorica-date-column',
      width: 120,
      render: (_, record) => (
        <Text type="secondary">{formatDate(record.updatedAt || record.createdAt)}</Text>
      ),
    },
    {
      title: '',
      dataIndex: 'operate',
      className: 'memorica-action-column',
      width: 148,
      align: 'right',
      render: (_, record) =>
        tab === 'trash' ? (
          <Button
            aria-label="恢复文档"
            icon={<UndoOutlined />}
            type="text"
            size="small"
            onClick={(event) => {
              event.stopPropagation()
              handleRestore(record.id)
            }}
          />
        ) : (
          <Space size={2}>
            {record.itemType !== 'folder' && (
              <Button
                aria-label={record.isFavorite ? '取消收藏' : '收藏文档'}
                icon={record.isFavorite ? <StarFilled /> : <StarOutlined />}
                type="text"
                size="small"
                onClick={(event) => {
                  event.stopPropagation()
                  handleFavorite(record)
                }}
              />
            )}
            {(tab === 'my' || tab === 'workspace') && (
              <>
                <Button
                  aria-label="重命名"
                  icon={<EditOutlined />}
                  type="text"
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation()
                    openRename(record)
                  }}
                />
                <Button
                  aria-label="移动"
                  icon={<FolderOpenOutlined />}
                  type="text"
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation()
                    openMove(record)
                  }}
                />
                <Popconfirm
                  title="确定删除这个文档？"
                  description="删除后文档会进入回收站，可从回收站恢复。"
                  okText="删除"
                  okButtonProps={{ danger: true }}
                  cancelText="取消"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button
                    aria-label="删除文档"
                    icon={<DeleteOutlined />}
                    type="text"
                    danger
                    size="small"
                    onClick={(event) => event.stopPropagation()}
                  />
                </Popconfirm>
              </>
            )}
          </Space>
        ),
    },
  ]

  const activeTitle =
    tab === 'workspace'
      ? currentFolder?.title || '全部文档'
      : tab === 'my'
        ? '归我所有'
        : tab === 'recent'
          ? '最近访问'
          : tab === 'favorite'
            ? '收藏'
            : tab === 'trash'
              ? '回收站'
              : tab === 'public'
                ? '公开文档'
                : '与我共享'

  const topTitle = tab === 'workspace' ? '文档库' : activeTitle

  const quickActions = [
    {
      title: '新建',
      description: '空白文档',
      icon: <PlusOutlined />,
      color: '#3b82f6',
      bg: '#eff6ff',
      onClick: () => handleCreate(),
    },
    {
      title: '导入',
      description: '本地文件',
      icon: <CloudUploadOutlined />,
      color: '#f59e0b',
      bg: '#fffbeb',
      onClick: () => message.info('导入暂未开放'),
    },
    {
      title: '模板',
      description: '常用格式',
      icon: <SnippetsOutlined />,
      color: '#8b5cf6',
      bg: '#f5f3ff',
      onClick: () => handleCreate('模板文档'),
    },
  ]

  const documentTabs = [
    { key: 'workspace', label: '全部文档' },
    { key: 'my', label: '归我所有' },
    { key: 'recent', label: '最近访问' },
    { key: 'favorite', label: '收藏' },
    { key: 'shared', label: '与我共享' },
    { key: 'public', label: '公开文档' },
    { key: 'trash', label: '回收站' },
  ]

  const emptyConfig = query.trim()
    ? { title: '没有匹配的文档', desc: '换个关键词再试试。', showBtn: false }
    : tab === 'trash'
      ? { title: '回收站为空', desc: '删除的文档会显示在这里。', showBtn: false }
      : tab === 'shared'
        ? { title: '暂无共享文档', desc: '别人分享给你的文档会显示在这里。', showBtn: false }
        : tab === 'public'
          ? { title: '暂无公开文档', desc: '公开文档会显示在这里。', showBtn: false }
          : { title: '还没有文档', desc: '创建你的第一个文档，开始记录想法。', showBtn: true }

  const accountMenu: MenuProps = {
    items: [
      { key: 'name', label: displayName, disabled: true },
      { type: 'divider' },
      { key: 'logout', label: '退出登录' },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') handleLogout()
    },
  }

  const emptyNode = (
    <div className="memorica-empty">
      <div className="memorica-empty-icon">
        <FileOutlined />
      </div>
      <div className="memorica-empty-title">{emptyConfig.title}</div>
      <div className="memorica-empty-desc">{emptyConfig.desc}</div>
      {emptyConfig.showBtn && (
        <Button icon={<PlusOutlined />} type="primary" onClick={() => handleCreate()}>
          新建文档
        </Button>
      )}
    </div>
  )

  return (
    <div className="memorica-workspace">
      <header className="memorica-header">
        <Title level={3} className="memorica-header-title">
          {topTitle}
        </Title>
        <Space size={6} className="memorica-header-actions">
          <Button
            aria-label="搜索"
            icon={<SearchOutlined />}
            type="text"
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>('.memorica-pro-search input')
              if (input) input.focus()
            }}
          />
          <Button
            aria-label="通知"
            icon={<BellOutlined />}
            type="text"
            onClick={() => message.info('暂无通知')}
          />
          <Dropdown trigger={['click']} placement="bottomRight" menu={accountMenu}>
            <span className="memorica-header-avatar-wrap">
              <Avatar size={24}>{initials(displayName)}</Avatar>
            </span>
          </Dropdown>
        </Space>
      </header>

      <main className="memorica-content">
        <div className="memorica-quick-grid">
          {quickActions.map((action) => (
            <button className="memorica-quick-button" key={action.title} type="button" onClick={action.onClick}>
              <div className="memorica-quick-card">
                <span className="memorica-quick-icon" style={{ color: action.color, background: action.bg }}>
                  {action.icon}
                </span>
                <div className="memorica-quick-copy">
                  <div className="memorica-quick-title">{action.title}</div>
                  <div className="memorica-quick-desc">{action.description}</div>
                </div>
                <DownOutlined className="memorica-quick-chevron" />
              </div>
            </button>
          ))}
        </div>

        <div className="memorica-toolbar">
          <div className="memorica-toolbar-left">
            {canUseFolders && folderStack.length > 0 && (
              <Space size={6} className="memorica-breadcrumb">
                <button type="button" onClick={jumpToRoot}>
                  根目录
                </button>
                {folderStack.map((folder, index) => (
                  <button key={folder.id} type="button" onClick={() => jumpToFolder(index)}>
                    / {folder.title}
                  </button>
                ))}
              </Space>
            )}
          </div>
          <div className="memorica-toolbar-right">
            {canUseFolders && (
              <Button
                icon={<FolderOpenOutlined />}
                type="text"
                size="small"
                onClick={() => setFolderModalVisible(true)}
              >
                文件夹
              </Button>
            )}
            <Button
              data-testid="memorica-create-document"
              icon={<PlusOutlined />}
              type="primary"
              size="small"
              onClick={() => handleCreate()}
            >
              新建
            </Button>
            <span className="memorica-count-pill">{rows.length} 项</span>
          </div>
        </div>

        <div className="memorica-tabs-bar">
          <div className="memorica-fly-tabs">
            {documentTabs.map((item) => (
              <button
                key={item.key}
                type="button"
                className={tab === item.key ? 'active' : ''}
                onClick={() => switchTab(item.key as TabKey)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <Skeleton loading={loading} active paragraph={{ rows: 4 }} className="memorica-skeleton">
          <ProTable<WorkspaceRow>
            className={`memorica-table${loading ? ' loading' : ''}`}
            columns={columns}
            dataSource={rows}
            locale={{ emptyText: emptyNode }}
            onRow={(record) => ({
              onClick: () => {
                if (!record || tab === 'trash') return
                if (record.itemType === 'folder') {
                  enterFolder(record)
                  return
                }
                navigate(`/doc/${record.id}`)
              },
            })}
            pagination={false}
            rowKey="id"
            search={false}
            options={false}
            toolBarRender={false}
            size="small"
          />
        </Skeleton>
      </main>

      <Modal
        title="新建文件夹"
        open={folderModalVisible}
        okText="创建"
        cancelText="取消"
        onCancel={() => {
          setFolderModalVisible(false)
          setFolderName('')
        }}
        onOk={handleCreateFolder}
      >
        <Input
          autoFocus
          placeholder="文件夹名称"
          value={folderName}
          onChange={(event) => setFolderName(event.target.value)}
          onPressEnter={handleCreateFolder}
        />
      </Modal>
      <Modal
        title="重命名"
        open={renameVisible}
        okText="保存"
        cancelText="取消"
        onCancel={() => {
          setRenameVisible(false)
          setActiveRecord(undefined)
        }}
        onOk={handleRename}
      >
        <Input
          autoFocus
          placeholder="名称"
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          onPressEnter={handleRename}
        />
      </Modal>
      <Modal
        title="移动到"
        open={moveVisible}
        okText="移动"
        cancelText="取消"
        onCancel={() => {
          setMoveVisible(false)
          setActiveRecord(undefined)
        }}
        onOk={handleMove}
      >
        <Select
          value={moveTargetId}
          onChange={setMoveTargetId}
          style={{ width: '100%' }}
          options={[
            { value: '', label: '根目录' },
            ...folderOptions.map((folder) => ({ value: folder.id, label: folder.title })),
          ]}
        />
      </Modal>
    </div>
  )
}
