import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { listRecentDocuments } from '../api/client'
import type { DocumentItem } from '../api/client'
import Toast from '@douyinfe/semi-ui-19/lib/es/toast'
import { SidebarContext } from '../contexts/SidebarContext'
import {
  PanelLeft,
  FileText,
  Home,
  Clock,
  Cloud,
  Globe,
  Settings,
  Search,
} from 'lucide-react'

const navItems = [
  { itemKey: 'docs', text: '文档库', icon: Home },
  { itemKey: 'drive', text: '网盘', icon: Cloud },
  { itemKey: 'team', text: '团队空间', icon: Globe },
  { itemKey: 'settings', text: '系统配置', icon: Settings },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('memorica-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [initialRender, setInitialRender] = useState(true)
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([])
  const [query, setQuery] = useState('')

  const docId = location.pathname.startsWith('/doc/')
    ? location.pathname.split('/')[2]
    : undefined

  const refreshRecentDocs = useCallback(() => {
    listRecentDocuments(0, 25)
      .then(setRecentDocs)
      .catch(() => Toast.error('文档列表加载失败'))
  }, [])

  const updateDocTitle = useCallback((id: string, title: string) => {
    setRecentDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, title: title || '未命名文档' } : d))
    )
  }, [])

  useEffect(() => {
    refreshRecentDocs()
    // 首次渲染后移除 no-transition，恢复 width 动画
    const t = window.setTimeout(() => {
      setInitialRender(false)
      const sidebar = document.querySelector('.memorica-app-sidebar')
      if (sidebar) sidebar.classList.remove('no-transition')
    }, 50)
    return () => window.clearTimeout(t)
  }, [refreshRecentDocs])

  const activeModule = 'docs'

  const switchModule = (moduleKey: string) => {
    if (moduleKey === 'docs') {
      navigate('/')
    } else {
      Toast.info('功能暂未开放')
    }
  }

  return (
    <SidebarContext.Provider
      value={{ recentDocs, refreshRecentDocs, updateDocTitle, collapsed, setCollapsed, query, setQuery }}
    >
      <div className="memorica-app-layout">
        <aside className={`memorica-app-sidebar${collapsed ? ' collapsed' : ''}${initialRender ? ' no-transition' : ''}`}>
          <div className="memorica-app-sidebar-header">
            <button
              type="button"
              className="memorica-app-sidebar-toggle"
              onClick={() => {
                const next = !collapsed
                setCollapsed(next)
                try {
                  localStorage.setItem('memorica-sidebar-collapsed', String(next))
                } catch {
                  return
                }
              }}
              title={collapsed ? '展开' : '收起'}
            >
              <PanelLeft className={`w-4 h-4${collapsed ? ' rotate-180' : ''}`} />
            </button>
            {!collapsed && <span className="memorica-app-sidebar-brand">Memorica</span>}
          </div>

          {!collapsed && (
            <div className="memorica-app-sidebar-search">
              <div className="memorica-app-sidebar-search-inner">
                <Search className="w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="搜索文档..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && location.pathname !== '/') {
                      navigate('/')
                    }
                  }}
                />
              </div>
            </div>
          )}

          <div className="memorica-app-sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.itemKey}
                type="button"
                className={activeModule === item.itemKey ? 'active' : ''}
                onClick={() => switchModule(item.itemKey)}
              >
                <item.icon className="w-4 h-4" />
                {!collapsed && <span>{item.text}</span>}
              </button>
            ))}
          </div>

          <div className="memorica-app-sidebar-divider" />

          <div className="memorica-app-sidebar-section">
            {!collapsed && (
              <div className="memorica-app-sidebar-section-title">
                <Clock className="w-3.5 h-3.5" />
                <span>最近访问</span>
              </div>
            )}
            <div className="memorica-app-sidebar-docs">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`memorica-app-sidebar-doc${doc.id === docId ? ' active' : ''}`}
                  onClick={() => {
                    if (doc.id !== docId) navigate(`/doc/${doc.id}`)
                  }}
                  title={doc.title || '未命名文档'}
                >
                  <FileText className="w-4 h-4" />
                  {!collapsed && <span>{doc.title || '未命名文档'}</span>}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="memorica-app-main">{children}</main>
      </div>
    </SidebarContext.Provider>
  )
}
