import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ProLayout, type MenuDataItem } from '@ant-design/pro-components'
import { App as AntdApp, Button, Input } from 'antd'
import {
  ClockCircleOutlined,
  CloudOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HomeOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { listRecentDocuments } from '../api/client'
import type { DocumentItem } from '../api/client'
import { SidebarContext } from '../contexts/SidebarContext'

const moduleRoutes: MenuDataItem[] = [
  { path: '/', name: '文档库', icon: <HomeOutlined /> },
  { path: '/drive', name: '网盘', icon: <CloudOutlined /> },
  { path: '/team', name: '团队空间', icon: <GlobalOutlined /> },
  { path: '/settings', name: '系统配置', icon: <SettingOutlined /> },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = AntdApp.useApp()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('memorica-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([])
  const [query, setQuery] = useState('')
  const [isRailViewport, setIsRailViewport] = useState(false)

  const refreshRecentDocs = useCallback(() => {
    listRecentDocuments(0, 25)
      .then(setRecentDocs)
      .catch(() => message.error('文档列表加载失败'))
  }, [message])

  const updateDocTitle = useCallback((id: string, title: string) => {
    setRecentDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, title: title || '未命名文档' } : d))
    )
  }, [])

  useEffect(() => {
    refreshRecentDocs()
  }, [refreshRecentDocs])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)')
    const update = () => setIsRailViewport(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const routes = useMemo<MenuDataItem[]>(() => {
    const recentRoutes: MenuDataItem[] = recentDocs.map((doc) => ({
      path: `/doc/${doc.id}`,
      name: doc.title || '未命名文档',
      icon: <FileTextOutlined />,
    }))

    return [
      ...moduleRoutes,
      {
        path: '/recent',
        name: '最近访问',
        icon: <ClockCircleOutlined />,
        children: recentRoutes,
      },
    ]
  }, [recentDocs])

  const handleMenuClick = (item: MenuDataItem) => {
    const path = item.path || '/'
    if (path === '/') {
      navigate('/')
      return
    }
    if (path.startsWith('/doc/')) {
      if (path !== location.pathname) navigate(path)
      return
    }
    message.info('功能暂未开放')
  }

  const effectiveCollapsed = collapsed || isRailViewport

  return (
    <SidebarContext.Provider
      value={{ recentDocs, refreshRecentDocs, updateDocTitle, collapsed, setCollapsed, query, setQuery }}
    >
      <ProLayout
        className={`memorica-pro-layout${effectiveCollapsed ? ' memorica-pro-layout-collapsed' : ''}`}
        title="Memorica"
        logo={<FileTextOutlined />}
        layout="side"
        navTheme="light"
        siderWidth={248}
        fixedHeader={false}
        fixSiderbar
        collapsed={effectiveCollapsed}
        onCollapse={(next) => {
          if (isRailViewport) return
          setCollapsed(next)
          try {
            localStorage.setItem('memorica-sidebar-collapsed', String(next))
          } catch {
            return
          }
        }}
        route={{ path: '/', routes }}
        location={{ pathname: location.pathname }}
        menu={{
          defaultOpenAll: true,
        }}
        menuHeaderRender={(_, title) => title}
        menuItemRender={(item, defaultDom) => (
          <Button
            type="text"
            block
            className={`memorica-pro-menu-button${item.path === location.pathname || (item.path === '/' && location.pathname === '/') ? ' active' : ''}`}
            onClick={() => handleMenuClick(item)}
            title={String(item.name || '')}
          >
            {defaultDom}
          </Button>
        )}
        menuExtraRender={() =>
          effectiveCollapsed ? null : (
            <div className="memorica-pro-search">
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="搜索文档"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onPressEnter={() => {
                  if (location.pathname !== '/') navigate('/')
                }}
              />
            </div>
          )
        }
        contentStyle={{ padding: 0, minHeight: '100vh' }}
      >
        <main className="memorica-app-main">{children}</main>
      </ProLayout>
    </SidebarContext.Provider>
  )
}
