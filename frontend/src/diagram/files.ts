const FORBIDDEN_PATH_CHARS = /[<>:"/\\|?*]+/g
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
const MAX_BASENAME_LENGTH = 80

function trimUnsafeEdges(value: string) {
  return value.replace(/^[\s._]+|[\s._]+$/g, '')
}

function replaceUnsafeFileChars(value: string) {
  return Array.from(value, (char) => {
    const code = char.charCodeAt(0)
    return code <= 31 || code === 127 ? '_' : char
  }).join('').replace(FORBIDDEN_PATH_CHARS, '_')
}

export function safeDiagramDownloadName(title?: string) {
  const rawTitle = (title || '').trim().replace(/\.svg$/i, '')
  const normalized = trimUnsafeEdges(
    replaceUnsafeFileChars(rawTitle).replace(/_+/g, '_')
  )
  const baseName = !normalized || WINDOWS_RESERVED_NAMES.test(normalized)
    ? 'diagram'
    : normalized
  const clipped = trimUnsafeEdges(Array.from(baseName).slice(0, MAX_BASENAME_LENGTH).join(''))
  return `${clipped || 'diagram'}.svg`
}
