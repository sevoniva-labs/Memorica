export type AIAction =
  | 'continue'
  | 'polish'
  | 'translate-en'
  | 'translate-zh'
  | 'summarize'
  | 'explain'
  | 'shorter'
  | 'longer'
  | 'professional'
  | 'casual'
  | 'custom'

export const aiActionLabels: Record<AIAction, string> = {
  continue: '续写',
  polish: '润色',
  'translate-en': '翻译成英文',
  'translate-zh': '翻译成中文',
  summarize: '总结',
  explain: '解释',
  shorter: '缩短',
  longer: '加长',
  professional: '更专业',
  casual: '更随意',
  custom: '自定义',
}

export const aiActionIcons: Record<AIAction, string> = {
  continue: '✍️',
  polish: '✨',
  'translate-en': '🇺🇸',
  'translate-zh': '🇨🇳',
  summarize: '📋',
  explain: '💡',
  shorter: '📉',
  longer: '📈',
  professional: '👔',
  casual: '😎',
  custom: '🔮',
}
