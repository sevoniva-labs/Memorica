export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const SUPPORTED_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
])

export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp'
export const ATTACHMENT_ACCEPT = `${IMAGE_ACCEPT},application/pdf,.pdf`

type UploadTarget = 'image' | 'attachment'

type UploadValidationResult =
  | { ok: true }
  | { ok: false, message: string }

function formatBytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`
}

export function validateUploadFile(file: File, target: UploadTarget): UploadValidationResult {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: `文件不能超过 ${formatBytes(MAX_UPLOAD_BYTES)}` }
  }

  if (target === 'image' && !file.type.startsWith('image/')) {
    return { ok: false, message: '请选择 JPG、PNG、GIF 或 WebP 图片' }
  }

  if (!SUPPORTED_UPLOAD_TYPES.has(file.type)) {
    return { ok: false, message: '仅支持 JPG、PNG、GIF、WebP 图片或 PDF 文件' }
  }

  return { ok: true }
}
