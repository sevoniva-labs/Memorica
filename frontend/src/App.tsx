import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DocumentListPage from './pages/DocumentListPage'
import EditorPage from './pages/EditorPage'
import VersionHistoryPage from './pages/VersionHistoryPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DocumentListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/doc/:docId"
          element={
            <PrivateRoute>
              <EditorPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/doc/:docId/versions"
          element={
            <PrivateRoute>
              <VersionHistoryPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
