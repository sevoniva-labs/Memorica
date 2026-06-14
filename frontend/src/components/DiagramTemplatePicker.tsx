import { useState } from 'react'
import { Input, Modal } from 'antd'
import { PartitionOutlined } from '@ant-design/icons'
import { DIAGRAM_TEMPLATES, type DiagramTemplate } from '../diagram/templates'

interface Props {
  open: boolean
  onCancel: () => void
  onSelect: (template: DiagramTemplate, title: string) => void
}

export default function DiagramTemplatePicker({ open, onCancel, onSelect }: Props) {
  const [title, setTitle] = useState('图示')

  const confirmTemplate = (template: DiagramTemplate) => {
    onSelect(template, title.trim() || template.name)
    setTitle('图示')
  }

  const cancel = () => {
    setTitle('图示')
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
        <div className="memorica-diagram-template-grid">
          {DIAGRAM_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className="memorica-diagram-template"
              data-testid={`memorica-diagram-template-${template.id}`}
              onClick={() => confirmTemplate(template)}
            >
              <span className="memorica-diagram-template-icon" style={{ color: template.accent, background: `${template.accent}14` }}>
                <PartitionOutlined style={{ fontSize: 18 }} />
              </span>
              <span className="memorica-diagram-template-copy">
                <strong>{template.name}</strong>
                <em>{template.description}</em>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
