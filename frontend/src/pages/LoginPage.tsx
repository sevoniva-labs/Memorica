import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../api/client'
import { FileText } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = isLogin
        ? await login(username, password)
        : await register(username, password, email)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <FileText className="w-7 h-7 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Memorica</h1>
        </div>
        <h2 className="text-center text-sm text-gray-500 mb-6">
          {isLogin ? '登录您的账号' : '注册新账号'}
        </h2>
        {error && (
          <div className="mb-4 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">用户名</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="请输入用户名"
            />
          </div>
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!isLogin}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="请输入邮箱"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="请输入密码"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? '请稍候...' : isLogin ? '登录' : '注册'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-500">
          {isLogin ? '还没有账号？' : '已有账号？'}
          <button
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            className="text-blue-600 hover:underline ml-1"
          >
            {isLogin ? '立即注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  )
}
