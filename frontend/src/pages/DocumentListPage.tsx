import { useEffect, useMemo, useState, type Key } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  App as AntdApp,
  Avatar,
  Breadcrumb,
  Button,
  Dropdown,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Tabs,
  Typography,
} from 'antd'
import type { MenuProps } from 'antd'
import { PageContainer } from '@ant-design/pro-layout'
import { ProCard, ProTable, type ProColumns } from '@ant-design/pro-components'
import {
  BellOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  FileOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SearchOutlined,
  SnippetsOutlined,
  StarFilled,
  StarOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import {
  createDocument,
  createFolder,
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

const tabDefinitions: Array<{ key: TabKey; label: string }> = [
  { key: 'workspace', label: '全部文档' },
  { key: 'my', label: '我拥有的' },
  { key: 'recent', label: '最近访问' },
  { key: 'favorite', label: '收藏' },
  { key: 'shared', label: '与我共享' },
  { key: 'public', label: '公开文档' },
  { key: 'trash', label: '回收站' },
]

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

function tabTitle(tab: TabKey) {
  return tabDefinitions.find((item) => item.key === tab)?.label || '全部文档'
}

function itemTypeLabel(itemType?: DocumentItem['itemType']) {
  return itemType === 'folder' ? '文件夹' : '文档'
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
  const [listError, setListError] = useState('')
  const [creatingDocument, setCreatingDocument] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [moving, setMoving] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string>()
  const [deletingId, setDeletingId] = useState<string>()
  const [restoringId, setRestoringId] = useState<string>()
  const [batching, setBatching] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { message, modal } = AntdApp.useApp()

  const displayName = user?.displayName || user?.username || '用户'
  const currentFolder = folderStack[folderStack.length - 1]
  const currentParentId = currentFolder?.id
  const canUseFolders = tab === 'workspace' || tab === 'my'

  const rows = useMemo<WorkspaceRow[]>(() => {
    const normalized = query.trim().toLowerCase()
    return docs
      .filter((doc) => !normalized || doc.title.toLowerCase().includes(normalized))
      .map((doc) => ({ ...doc, key: doc.id }))
  }, [docs, query])

  const visibleRowIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows])
  const visibleSelectedRowKeys = useMemo(
    () => selectedRowKeys.filter((key) => visibleRowIds.has(String(key))),
    [selectedRowKeys, visibleRowIds]
  )
  const selectedRows = useMemo(
    () => rows.filter((row) => visibleSelectedRowKeys.includes(row.id)),
    [rows, visibleSelectedRowKeys]
  )

  const fetchDocuments = async (
    nextTab = tab,
    workspaceId = activeWorkspaceId,
    nextQuery = query,
    nextParentId = currentParentId
  ) => {
    if (nextTab === 'workspace' && !workspaceId) {
      setDocs([])
      setListError('')
      setLoading(false)
      return
    }
    setLoading(true)
    setListError('')
    try {
      const data = await loadDocuments(nextTab, workspaceId, nextQuery, nextParentId)
      setDocs(data)
    } catch {
      setDocs([])
      setListError('文档列表加载失败，请检查网络后重试')
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
      if (!cancelled) {
        setLoading(true)
        setListError('')
      }
    }, 120)

    const request = loadDocuments(tab, activeWorkspaceId, query, currentParentId)
    request
      .then((data) => {
        if (!cancelled) {
          setDocs(data)
          setListError('')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocs([])
          setListError('文档列表加载失败，请检查网络后重试')
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

  const handleCreate = async (title = '未命名文档') => {
    if (creatingDocument) return
    setCreatingDocument(true)
    try {
      const doc = await createDocument(title, activeWorkspaceId, canUseFolders ? currentParentId : undefined)
      navigate(`/doc/${doc.id}`)
    } catch {
      message.error('创建文档失败')
      setCreatingDocument(false)
    }
  }

  const handleCreateFolder = async () => {
    const title = folderName.trim()
    if (!title || creatingFolder) return
    setCreatingFolder(true)
    try {
      await createFolder(title, activeWorkspaceId, currentParentId)
      setFolderModalVisible(false)
      setFolderName('')
      message.success('文件夹已创建')
      fetchDocuments()
    } catch {
      message.error('创建文件夹失败')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (deletingId) return
    setDeletingId(id)
    try {
      await deleteDocument(id)
      setSelectedRowKeys((keys) => keys.filter((key) => key !== id))
      message.success('文档已删除')
      fetchDocuments()
    } catch {
      message.error('删除失败')
    } finally {
      setDeletingId(undefined)
    }
  }

  const handleRestore = async (id: string) => {
    if (restoringId) return
    setRestoringId(id)
    try {
      await restoreDocument(id)
      setSelectedRowKeys((keys) => keys.filter((key) => key !== id))
      message.success('文档已恢复')
      fetchDocuments()
    } catch {
      message.error('恢复失败')
    } finally {
      setRestoringId(undefined)
    }
  }

  const handleBatchDelete = async () => {
    if (batching || selectedRows.length === 0) return
    setBatching(true)
    try {
      await Promise.all(selectedRows.map((row) => deleteDocument(row.id)))
      setSelectedRowKeys([])
      message.success('已删除所选项目')
      fetchDocuments()
    } catch {
      message.error('批量删除失败')
    } finally {
      setBatching(false)
    }
  }

  const handleBatchRestore = async () => {
    if (batching || selectedRows.length === 0) return
    setBatching(true)
    try {
      await Promise.all(selectedRows.map((row) => restoreDocument(row.id)))
      setSelectedRowKeys([])
      message.success('已恢复所选项目')
      fetchDocuments()
    } catch {
      message.error('批量恢复失败')
    } finally {
      setBatching(false)
    }
  }

  const handleFavorite = async (record: DocumentItem) => {
    if (favoriteId) return
    setFavoriteId(record.id)
    try {
      const next = await setDocumentFavorite(record.id, !record.isFavorite)
      setDocs((items) => items.map((item) => (item.id === record.id ? { ...item, isFavorite: next.isFavorite } : item)))
      if (tab === 'favorite' && record.isFavorite) {
        setDocs((items) => items.filter((item) => item.id !== record.id))
      }
    } catch {
      message.error('收藏状态更新失败')
    } finally {
      setFavoriteId(undefined)
    }
  }

  const openRename = (record: DocumentItem) => {
    setActiveRecord(record)
    setRenameValue(record.title)
    setRenameVisible(true)
  }

  const handleRename = async () => {
    if (!activeRecord || !renameValue.trim() || renaming) return
    setRenaming(true)
    try {
      await updateDocumentMeta(activeRecord.id, renameValue.trim())
      setRenameVisible(false)
      setActiveRecord(undefined)
      message.success('名称已更新')
      fetchDocuments()
    } catch {
      message.error('重命名失败')
    } finally {
      setRenaming(false)
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
    if (!activeRecord || moving) return
    setMoving(true)
    try {
      await moveDocument(activeRecord.id, moveTargetId || null)
      setMoveVisible(false)
      setActiveRecord(undefined)
      message.success('已移动')
      fetchDocuments()
    } catch {
      message.error('移动失败')
    } finally {
      setMoving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const switchTab = (nextTab: TabKey) => {
    if (nextTab === tab) return
    setFolderStack([])
    setSelectedRowKeys([])
    setQuery('')
    setTab(nextTab)
  }

  const enterFolder = (folder: DocumentItem) => {
    setFolderStack((items) => [...items, folder])
    setSelectedRowKeys([])
    setQuery('')
    setLoading(true)
  }

  const jumpToFolder = (index: number) => {
    setFolderStack((items) => items.slice(0, index + 1))
    setSelectedRowKeys([])
    setQuery('')
    setLoading(true)
  }

  const jumpToRoot = () => {
    setFolderStack([])
    setSelectedRowKeys([])
    setQuery('')
    setLoading(true)
  }

  const confirmDelete = (record: DocumentItem) => {
    modal.confirm({
      title: `删除${itemTypeLabel(record.itemType)}？`,
      content: '删除后会进入回收站，可从回收站恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => handleDelete(record.id),
    })
  }

  const handleRowMenuClick = (record: DocumentItem): MenuProps['onClick'] => ({ key, domEvent }) => {
    domEvent.stopPropagation()
    if (key === 'rename') openRename(record)
    if (key === 'move') openMove(record)
    if (key === 'delete') confirmDelete(record)
  }

  const rowActionItems = (): MenuProps['items'] => [
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: '重命名',
      disabled: tab !== 'my' && tab !== 'workspace',
    },
    {
      key: 'move',
      icon: <FolderOpenOutlined />,
      label: '移动到',
      disabled: tab !== 'my' && tab !== 'workspace',
    },
    { type: 'divider' },
    {
      key: 'delete',
      danger: true,
      icon: <DeleteOutlined />,
      label: '删除',
      disabled: Boolean(deletingId) || (tab !== 'my' && tab !== 'workspace'),
    },
  ]

  const columns: ProColumns<WorkspaceRow>[] = [
    {
      title: '名称',
      dataIndex: 'title',
      ellipsis: true,
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
      width: 160,
      render: (_, record) => (
        <Space align="center" size={8}>
          <Avatar size={24}>{initials(record.ownerName || displayName)}</Avatar>
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
      width: 140,
      sorter: (a, b) =>
        new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime(),
      defaultSortOrder: 'descend',
      render: (_, record) => (
        <Text type="secondary">{formatDate(record.updatedAt || record.createdAt)}</Text>
      ),
    },
    {
      title: '',
      dataIndex: 'operate',
      className: 'memorica-action-column',
      width: 104,
      align: 'right',
      render: (_, record) => (
        <Space size={2} onClick={(event) => event.stopPropagation()}>
          {tab === 'trash' ? (
            <Button
              aria-label="恢复文档"
              icon={<UndoOutlined />}
              type="text"
              size="small"
              loading={restoringId === record.id}
              disabled={Boolean(restoringId)}
              onClick={() => handleRestore(record.id)}
            />
          ) : (
            <>
              {record.itemType !== 'folder' && (
                <Button
                  aria-label={record.isFavorite ? '取消收藏' : '收藏文档'}
                  icon={record.isFavorite ? <StarFilled /> : <StarOutlined />}
                  type="text"
                  size="small"
                  loading={favoriteId === record.id}
                  disabled={Boolean(favoriteId)}
                  onClick={() => handleFavorite(record)}
                />
              )}
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                menu={{ items: rowActionItems(), onClick: handleRowMenuClick(record) }}
              >
                <Button aria-label="更多操作" icon={<EllipsisOutlined />} type="text" size="small" />
              </Dropdown>
            </>
          )}
        </Space>
      ),
    },
  ]

  const activeTitle = tab === 'workspace' ? currentFolder?.title || '全部文档' : tabTitle(tab)
  const pageDescription = query.trim()
    ? `搜索：${query.trim()}`
    : currentFolder
      ? '当前文件夹'
      : tabTitle(tab)

  const documentTabs = useMemo(
    () =>
      tabDefinitions.map((item) => ({
        key: item.key,
        label: (
          <span className="memorica-tab-label">
            <span>{item.label}</span>
            {item.key === tab && <span className="memorica-tab-count">{rows.length}</span>}
          </span>
        ),
      })),
    [rows.length, tab]
  )

  const breadcrumbItems = [
    {
      title: (
        <Button type="link" size="small" className="memorica-breadcrumb-link" onClick={jumpToRoot}>
          根目录
        </Button>
      ),
    },
    ...folderStack.map((folder, index) => ({
      title: (
        <Button
          type="link"
          size="small"
          className="memorica-breadcrumb-link"
          onClick={() => jumpToFolder(index)}
        >
          {folder.title}
        </Button>
      ),
    })),
  ]

  const emptyConfig = query.trim()
    ? { title: '没有匹配的文档', desc: '换个关键词再试试。' }
    : tab === 'trash'
      ? { title: '回收站为空', desc: '删除的文档会显示在这里。' }
      : tab === 'shared'
        ? { title: '暂无共享文档', desc: '别人分享给你的文档会显示在这里。' }
        : tab === 'public'
          ? { title: '暂无公开文档', desc: '公开文档会显示在这里。' }
          : { title: '还没有文档', desc: '使用上方操作创建文档、文件夹，或从模板开始。' }

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
    <Empty
      className="memorica-empty"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <Space direction="vertical" size={4}>
          <Text strong>{emptyConfig.title}</Text>
          <Text type="secondary">{emptyConfig.desc}</Text>
        </Space>
      }
    />
  )

  const actionTiles = [
    {
      key: 'create',
      title: '新建文档',
      description: '创建空白协作文档',
      icon: <PlusOutlined />,
      disabled: creatingDocument,
      loading: creatingDocument,
      type: 'primary' as const,
      onClick: () => handleCreate(),
      testId: 'memorica-create-document',
    },
    {
      key: 'folder',
      title: '新建文件夹',
      description: '整理当前目录内容',
      icon: <FolderAddOutlined />,
      disabled: !canUseFolders || creatingFolder,
      onClick: () => setFolderModalVisible(true),
    },
    {
      key: 'import',
      title: '导入',
      description: '从本地文件导入',
      icon: <CloudUploadOutlined />,
      onClick: () => message.info('导入暂未开放'),
    },
    {
      key: 'template',
      title: '从模板开始',
      description: '生成常用格式文档',
      icon: <SnippetsOutlined />,
      disabled: creatingDocument,
      loading: creatingDocument,
      onClick: () => handleCreate('模板文档'),
    },
  ]

  return (
    <div className="memorica-workspace">
      <PageContainer
        title={<Title level={2} className="memorica-page-title">文档库</Title>}
        className="memorica-page-container"
        breadcrumbRender={false}
        content={
          <Space size={8} wrap className="memorica-page-meta">
            <Text strong>{activeTitle}</Text>
            <Text type="secondary">{pageDescription}</Text>
            <Text type="secondary">{rows.length} 项</Text>
          </Space>
        }
        extra={[
          <Input
            allowClear
            className="memorica-library-search"
            key="search"
            prefix={<SearchOutlined />}
            placeholder="搜索当前文档"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />,
          <Button
            aria-label="通知"
            icon={<BellOutlined />}
            key="notice"
            type="text"
            onClick={() => message.info('暂无通知')}
          />,
          <Dropdown key="account" trigger={['click']} placement="bottomRight" menu={accountMenu}>
            <Button className="memorica-account-button" type="text">
              <Avatar size={24}>{initials(displayName)}</Avatar>
              <span>{displayName}</span>
            </Button>
          </Dropdown>,
        ]}
      >
        <ProCard
          bordered={false}
          className="memorica-library-surface"
          data-testid="memorica-library-surface"
          boxShadow
        >
          <ProCard.Group className="memorica-action-grid" gutter={[12, 12]} ghost>
            {actionTiles.map((action) => (
              <ProCard bordered={false} className="memorica-action-card" colSpan={{ xs: 24, sm: 12, lg: 6 }} key={action.key}>
                <Button
                  block
                  className="memorica-action-tile"
                  data-testid={action.testId}
                  disabled={action.disabled}
                  icon={action.icon}
                  loading={action.loading}
                  type={action.type || 'default'}
                  onClick={action.onClick}
                >
                  <span className="memorica-action-copy">
                    <span className="memorica-action-title">{action.title}</span>
                    <span className="memorica-action-desc">{action.description}</span>
                  </span>
                </Button>
              </ProCard>
            ))}
          </ProCard.Group>

          <div className="memorica-library-toolbar">
            <div className="memorica-toolbar-left">
              {canUseFolders && folderStack.length > 0 ? (
                <Breadcrumb className="memorica-breadcrumb" items={breadcrumbItems} />
              ) : (
                <Text type="secondary">当前视图：{activeTitle}</Text>
              )}
            </div>
            <div className="memorica-toolbar-right">
              <Text type="secondary">{rows.length} 项</Text>
            </div>
          </div>

          <Tabs
            activeKey={tab}
            className="memorica-fly-tabs"
            items={documentTabs}
            onChange={(key) => switchTab(key as TabKey)}
            size="middle"
          />

          {listError && (
            <Alert
              data-testid="memorica-list-error"
              className="memorica-list-error"
              type="error"
              showIcon
              message={listError}
              action={
                <Button data-testid="memorica-list-retry" size="small" onClick={() => fetchDocuments()}>
                  重试
                </Button>
              }
            />
          )}

          <Skeleton loading={loading && rows.length === 0} active paragraph={{ rows: 4 }} className="memorica-skeleton">
            <ProTable<WorkspaceRow>
              cardProps={false}
              className="memorica-table"
              columns={columns}
              dataSource={rows}
              locale={{ emptyText: emptyNode }}
              loading={loading && rows.length > 0}
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
              rowSelection={{
                selectedRowKeys: visibleSelectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys),
                preserveSelectedRowKeys: true,
              }}
              search={false}
              options={false}
              toolBarRender={false}
              tableAlertRender={({ selectedRowKeys }) => (
                <Space size={8}>
                  <Text>已选 {selectedRowKeys.length} 项</Text>
                  <Button type="link" size="small" onClick={() => setSelectedRowKeys([])}>
                    取消选择
                  </Button>
                </Space>
              )}
              tableAlertOptionRender={() =>
                tab === 'trash' ? (
                  <Button size="small" loading={batching} onClick={handleBatchRestore}>
                    恢复所选
                  </Button>
                ) : (
                  <Popconfirm
                    title="删除所选项目？"
                    description="删除后项目会进入回收站，可从回收站恢复。"
                    okText="删除"
                    okButtonProps={{ danger: true, loading: batching }}
                    cancelText="取消"
                    onConfirm={handleBatchDelete}
                  >
                    <Button danger size="small" loading={batching}>
                      删除所选
                    </Button>
                  </Popconfirm>
                )
              }
              size="middle"
            />
          </Skeleton>
        </ProCard>

        <Modal
          title="新建文件夹"
          open={folderModalVisible}
          okText="创建"
          cancelText="取消"
          confirmLoading={creatingFolder}
          onCancel={() => {
            if (creatingFolder) return
            setFolderModalVisible(false)
            setFolderName('')
          }}
          onOk={handleCreateFolder}
        >
          <Input
            autoFocus
            placeholder="文件夹名称"
            value={folderName}
            disabled={creatingFolder}
            onChange={(event) => setFolderName(event.target.value)}
            onPressEnter={handleCreateFolder}
          />
        </Modal>
        <Modal
          title="重命名"
          open={renameVisible}
          okText="保存"
          cancelText="取消"
          confirmLoading={renaming}
          onCancel={() => {
            if (renaming) return
            setRenameVisible(false)
            setActiveRecord(undefined)
          }}
          onOk={handleRename}
        >
          <Input
            autoFocus
            placeholder="名称"
            value={renameValue}
            disabled={renaming}
            onChange={(event) => setRenameValue(event.target.value)}
            onPressEnter={handleRename}
          />
        </Modal>
        <Modal
          title="移动到"
          open={moveVisible}
          okText="移动"
          cancelText="取消"
          confirmLoading={moving}
          onCancel={() => {
            if (moving) return
            setMoveVisible(false)
            setActiveRecord(undefined)
          }}
          onOk={handleMove}
        >
          <Select
            value={moveTargetId}
            onChange={setMoveTargetId}
            disabled={moving}
            style={{ width: '100%' }}
            options={[
              { value: '', label: '根目录' },
              ...folderOptions.map((folder) => ({ value: folder.id, label: folder.title })),
            ]}
          />
        </Modal>
      </PageContainer>
    </div>
  )
}
