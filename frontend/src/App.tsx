import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { App as AntdApp, ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useAuthStore } from './stores/authStore'
import AppErrorBoundary from './components/AppErrorBoundary'
import AppLayout from './components/AppLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DocumentListPage = lazy(() => import('./pages/DocumentListPage'))
const EditorPage = lazy(() => import('./pages/EditorPage'))
const VersionHistoryPage = lazy(() => import('./pages/VersionHistoryPage'))

function PageFallback() {
  return (
    <div className="memorica-route-loading">
      <div />
      <span>加载 Memorica</span>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <PageFallback />
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <AppErrorBoundary>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#245bdb',
            borderRadius: 8,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Helvetica Neue", "Segoe UI", Arial, sans-serif',
          },
        }}
      >
        <AntdApp message={{ maxCount: 3 }}>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <AppLayout>
                        <DocumentListPage />
                      </AppLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/doc/:docId"
                  element={
                    <PrivateRoute>
                      <AppLayout>
                        <EditorPage />
                      </AppLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/doc/:docId/versions"
                  element={
                    <PrivateRoute>
                      <AppLayout>
                        <VersionHistoryPage />
                      </AppLayout>
                    </PrivateRoute>
                  }
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </AppErrorBoundary>
  )
}

export default App
