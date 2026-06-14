const DRAWIO_DIAGRAM_BODY_PATTERN = /<diagram\b[^>]*>([\s\S]*?)<\/diagram>/gi
const BASE64_BODY_PATTERN = /^[A-Za-z0-9+/=]+$/

export function isEditableDrawioXml(xml?: string) {
  const value = (xml || '').trim()
  if (!value || !/^<mxfile\b/i.test(value)) return false

  const bodies = Array.from(value.matchAll(DRAWIO_DIAGRAM_BODY_PATTERN), (match) => match[1].trim())
  if (bodies.length === 0) return false

  return bodies.every((body) => {
    if (!body) return false
    if (body.includes('<') || body.includes('>')) return false
    return BASE64_BODY_PATTERN.test(body)
  })
}

export function drawioXmlIssueText(xml?: string) {
  if (!(xml || '').trim()) return '图示数据为空'
  if (!isEditableDrawioXml(xml)) return '图示数据可能损坏，请从历史版本恢复或重新插入图示'
  return 'XML 已保留，可重新编辑生成预览'
}
