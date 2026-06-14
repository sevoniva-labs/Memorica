import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { login, register } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { FileTextOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'

const { Text, Title } = Typography

interface LoginValues {
  username: string
  password: string
  email?: string
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const storeLogin = useAuthStore((s) => s.login)

  const handleSubmit = async (values: LoginValues) => {
    setError('')
    setLoading(true)
    try {
      const data = isLogin
        ? await login(values.username, values.password)
        : await register(values.username, values.password, values.email || '')
      storeLogin(data.accessToken, data.refreshToken, data.user)
      navigate('/')
    } catch (err: unknown) {
      const msg = isAxiosError<{ message?: string; error?: string }>(err)
        ? err.response?.data?.message || err.response?.data?.error || '操作失败'
        : '操作失败'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm shadow-sm" styles={{ body: { padding: 32 } }}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <FileTextOutlined className="text-blue-600" style={{ fontSize: 28 }} />
          <Title level={3} className="!mb-0 !text-xl">
            Memorica
          </Title>
        </div>
        <Text type="secondary" className="block text-center mb-6">
          {isLogin ? '登录您的账号' : '注册新账号'}
        </Text>
        {error && (
          <Alert className="mb-4" type="error" showIcon message={error} />
        )}
        <Form<LoginValues>
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input autoComplete="username" placeholder="请输入用户名" />
          </Form.Item>
          {!isLogin && (
            <Form.Item
              label="邮箱"
              name="email"
              preserve={false}
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效邮箱' },
              ]}
            >
              <Input autoComplete="email" placeholder="请输入邮箱" type="email" />
            </Form.Item>
          )}
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="请输入密码"
            />
          </Form.Item>
          <Form.Item className="!mb-0">
            <Button type="primary" htmlType="submit" block loading={loading}>
              {isLogin ? '登录' : '注册'}
            </Button>
          </Form.Item>
        </Form>
        <div className="mt-4 text-center">
          <Text type="secondary" className="text-xs">
            {isLogin ? '还没有账号？' : '已有账号？'}
          </Text>
          <Button
            type="link"
            size="small"
            className="!px-1"
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
          >
            {isLogin ? '立即注册' : '去登录'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
