import { useMemo, useState } from 'react'
import { Button, Empty, Input, Modal, Segmented, Tag } from 'antd'
import { PartitionOutlined, SearchOutlined } from '@ant-design/icons'
import {
  DIAGRAM_TEMPLATES,
  type DiagramTemplate,
  type DiagramTemplateCategory,
  type DiagramTemplateId,
} from '../diagram/templates'

interface Props {
  open: boolean
  onCancel: () => void
  onSelect: (template: DiagramTemplate, title: string) => void
}

type CategoryFilter = 'all' | DiagramTemplateCategory

const RECENT_TEMPLATE_KEY = 'memorica:diagram-recent-templates'
const categoryOptions: Array<{ label: string, value: CategoryFilter }> = [
  { label: '全部', value: 'all' },
  { label: '基础', value: 'basic' },
  { label: '流程', value: 'process' },
  { label: '系统', value: 'system' },
  { label: '规划', value: 'planning' },
]

const categoryLabels: Record<DiagramTemplateCategory, string> = {
  basic: '基础',
  process: '流程',
  system: '系统',
  planning: '规划',
}

function readRecentTemplates(): DiagramTemplateId[] {
  try {
    const value = window.localStorage.getItem(RECENT_TEMPLATE_KEY)
    if (!value) return []
    const ids = JSON.parse(value) as string[]
    return ids.filter((id): id is DiagramTemplateId =>
      DIAGRAM_TEMPLATES.some((template) => template.id === id)
    )
  } catch {
    return []
  }
}

function writeRecentTemplate(id: DiagramTemplateId) {
  try {
    const ids = readRecentTemplates()
    const next = [id, ...ids.filter((item) => item !== id)].slice(0, 4)
    window.localStorage.setItem(RECENT_TEMPLATE_KEY, JSON.stringify(next))
    return next
  } catch {
    return []
  }
}

export default function DiagramTemplatePicker({ open, onCancel, onSelect }: Props) {
  const [title, setTitle] = useState('图示')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [recentIds, setRecentIds] = useState<DiagramTemplateId[]>(() => readRecentTemplates())

  const recentTemplates = useMemo(
    () => recentIds
      .map((id) => DIAGRAM_TEMPLATES.find((template) => template.id === id))
      .filter((template): template is DiagramTemplate => Boolean(template)),
    [recentIds]
  )

  const filteredTemplates = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return DIAGRAM_TEMPLATES.filter((template) => {
      const matchesCategory = category === 'all' || template.category === category
      if (!matchesCategory) return false
      if (!keyword) return true
      return [
        template.name,
        template.description,
        template.category,
        ...template.keywords,
      ].some((value) => value.toLowerCase().includes(keyword))
    })
  }, [category, query])

  const confirmTemplate = (template: DiagramTemplate) => {
    setRecentIds(writeRecentTemplate(template.id))
    onSelect(template, title.trim() || template.name)
    setTitle('图示')
    setQuery('')
    setCategory('all')
  }

  const cancel = () => {
    setTitle('图示')
    setQuery('')
    setCategory('all')
    onCancel()
  }

  return (
    <Modal
      title="插入图示"
      open={open}
      footer={null}
      width={720}
      destroyOnHidden
      onCancel={cancel}
    >
      <div className="memorica-diagram-picker" data-testid="memorica-diagram-template-picker">
        <Input
          data-testid="memorica-diagram-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="图示标题"
          maxLength={80}
        />
        <div className="memorica-diagram-picker-tools">
          <Input
            allowClear
            data-testid="memorica-diagram-template-search"
            prefix={<SearchOutlined />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索模板"
          />
          <Segmented
            data-testid="memorica-diagram-template-category"
            value={category}
            options={categoryOptions}
            onChange={(value) => setCategory(value as CategoryFilter)}
          />
        </div>
        {recentTemplates.length > 0 && (
          <div className="memorica-diagram-template-recent" data-testid="memorica-diagram-template-recent">
            <span>最近使用</span>
            <div>
              {recentTemplates.map((template) => (
                <Button
                  key={template.id}
                  className="memorica-diagram-template-recent-btn"
                  onClick={() => confirmTemplate(template)}
                  size="small"
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </div>
        )}
        {filteredTemplates.length > 0 ? (
          <div className="memorica-diagram-template-grid">
            {filteredTemplates.map((template) => (
              <Button
                block
                key={template.id}
                className="memorica-diagram-template"
                data-testid={`memorica-diagram-template-${template.id}`}
                onClick={() => confirmTemplate(template)}
              >
                <span className="memorica-diagram-template-icon" style={{ color: template.accent, background: `${template.accent}14` }}>
                  <PartitionOutlined style={{ fontSize: 18 }} />
                </span>
                <span className="memorica-diagram-template-copy">
                  <span className="memorica-diagram-template-title-row">
                    <strong>{template.name}</strong>
                    <Tag bordered={false} color={template.accent}>
                      {categoryLabels[template.category]}
                    </Tag>
                  </span>
                  <em>{template.description}</em>
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <Empty
            className="memorica-diagram-template-empty"
            description="没有找到匹配的图示模板"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
    </Modal>
  )
}
