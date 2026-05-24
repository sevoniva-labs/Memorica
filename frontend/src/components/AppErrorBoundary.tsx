import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application crashed', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="memorica-error-page">
        <div>
          <span>Memorica</span>
          <h1>页面暂时不可用</h1>
          <p>当前视图发生异常。你可以刷新页面，或返回文档工作台继续处理其他文档。</p>
          <div className="memorica-error-actions">
            <button onClick={() => window.location.reload()}>刷新页面</button>
            <a href="/">返回工作台</a>
          </div>
        </div>
      </div>
    )
  }
}
