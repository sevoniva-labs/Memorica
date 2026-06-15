import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const collabEditorPath = 'frontend/src/components/CollabEditor.tsx'
const aiAssistantPath = 'frontend/src/components/AIAssistant.tsx'

test('collaboration editor gates every AI entrypoint behind edit permission', async () => {
  const source = await readFile(collabEditorPath, 'utf8')

  assert.match(source, /const closeAIAssistant = useCallback\(\(\) => \{[\s\S]*setAiOpen\(false\)[\s\S]*setAiInitialAction\(null\)[\s\S]*\}, \[\]\)/)
  assert.match(source, /const openAIAssistant = useCallback\(\(action: AIAction \| null = null\) => \{[\s\S]*if \(!canEdit\) return[\s\S]*setAiInitialAction\(action\)[\s\S]*setAiOpen\(true\)[\s\S]*\}, \[canEdit\]\)/)
  assert.match(source, /const applyEditPermission = useCallback\(\(nextCanEdit: boolean\) => \{[\s\S]*setCanEdit\(nextCanEdit\)[\s\S]*if \(!nextCanEdit\) \{[\s\S]*closeAIAssistant\(\)[\s\S]*\}/)
  assert.match(source, /\{aiOpen && canEdit && \(/)
  assert.match(source, /<AIAssistant\b[\s\S]*canEdit=\{canEdit\}/)
  assert.match(source, /onClick=\{\(\) => \{[\s\S]*if \(!canEdit\) return[\s\S]*if \(aiOpen\) \{[\s\S]*closeAIAssistant\(\)[\s\S]*return[\s\S]*\}[\s\S]*openAIAssistant\(\)[\s\S]*\}\}/)
  assert.match(source, /<BubbleMenuBar editor=\{editor\} onAskAI=\{canEdit \? \(\) => openAIAssistant\(\) : undefined\}/)
  assert.match(source, /onAskAI=\{canEdit \? \(action\) => openAIAssistant\(action\) : undefined\}/)
})

test('AI assistant refuses generation or editor mutation while readonly', async () => {
  const source = await readFile(aiAssistantPath, 'utf8')

  assert.match(source, /canEdit: boolean/)
  assert.match(source, /if \(!open \|\| !canEdit\) return null/)
  assert.match(source, /if \(!canEdit \|\| !editor \|\| streaming\) return/)
  assert.match(source, /if \(!canEdit \|\| !editor \|\| !result\) return/)
})

test('AI assistant shows generation failures as a non-insertable Ant Design alert', async () => {
  const source = await readFile(aiAssistantPath, 'utf8')

  assert.match(source, /import \{ apiErrorMessage, generateAI \} from '..\/api\/client'/)
  assert.match(source, /import \{ Alert, Button, Input \} from 'antd'/)
  assert.match(source, /const \[error, setError\] = useState\(''\)/)
  assert.match(source, /setError\(apiErrorMessage\(err, 'AI 服务暂时不可用，请稍后重试'\)\)/)
  assert.doesNotMatch(source, /setResult\(err instanceof Error/)
  assert.match(source, /\{error && \([\s\S]*<Alert\b[\s\S]*data-testid="memorica-ai-error"[\s\S]*type="error"[\s\S]*showIcon[\s\S]*message=\{error\}/)
})

test('frontend-check runs the AI permission policy test', async () => {
  const source = await readFile('Makefile', 'utf8')

  assert.match(source, /^frontend-ai-permission-policy-test: ## Verify editor AI controls require write permission$/m)
  assert.match(source, /^frontend-check: .*frontend-ai-permission-policy-test.*## Run frontend lint, Ant Design checks, and production build$/m)
})
