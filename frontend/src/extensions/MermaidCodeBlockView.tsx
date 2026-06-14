import { useEffect, useId, useMemo, useState } from 'react'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'

let mermaidInitialized = false
let mermaidPromise: Promise<typeof import('mermaid').default> | null = null

function loadMermaid() {
  mermaidPromise ??= import('mermaid').then(({ default: mermaid }) => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'default',
      })
      mermaidInitialized = true
    }
    return mermaid
  })
  return mermaidPromise
}

type RenderState = {
  source: string
  svg: string
  error: string
}

export function MermaidCodeBlockView({ node }: NodeViewProps) {
  const language = node.attrs.language as string | null
  const source = node.textContent
  const isMermaid = language === 'mermaid'
  const reactId = useId()
  const renderId = useMemo(
    () => `memorica-mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [reactId]
  )
  const [renderState, setRenderState] = useState<RenderState>({ source: '', svg: '', error: '' })
  const currentState = renderState.source === source ? renderState : { source, svg: '', error: '' }

  useEffect(() => {
    if (!isMermaid || !source.trim()) return

    let active = true
    loadMermaid()
      .then((mermaid) => mermaid.render(renderId, source))
      .then((result) => {
        if (!active) return
        setRenderState({ source, svg: result.svg, error: '' })
      })
      .catch((renderError: unknown) => {
        if (!active) return
        setRenderState({
          source,
          svg: '',
          error: renderError instanceof Error ? renderError.message : 'Mermaid 渲染失败',
        })
      })

    return () => {
      active = false
    }
  }, [isMermaid, renderId, source])

  if (!isMermaid) {
    return (
      <NodeViewWrapper as="pre" className="memorica-code-block">
        <NodeViewContent<'code'> as="code" />
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="memorica-mermaid-block" data-testid="memorica-mermaid-block">
      <div className="memorica-mermaid-preview" data-testid="memorica-mermaid-preview" contentEditable={false}>
        {currentState.error ? (
          <span className="memorica-mermaid-error">{currentState.error}</span>
        ) : currentState.svg ? (
          <div className="memorica-mermaid-svg" dangerouslySetInnerHTML={{ __html: currentState.svg }} />
        ) : (
          <span>Mermaid 渲染中</span>
        )}
      </div>
      <pre className="memorica-mermaid-source" data-testid="memorica-mermaid-source">
        <NodeViewContent<'code'> as="code" />
      </pre>
    </NodeViewWrapper>
  )
}
