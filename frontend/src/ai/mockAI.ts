/**
 * 模拟 AI 服务 - 用于演示 Notion AI 风格的流式输出
 * 实际项目中应替换为真实的 AI API 调用（OpenAI / Claude / Kimi 等）
 */

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

export interface AIRequest {
  action: AIAction
  text: string
  customPrompt?: string
}

const templates: Record<AIAction, (text: string) => string> = {
  continue: (_text) => {
    const continuations = [
      '在此基础上，我们可以进一步探讨这个话题的更多细节。首先，需要明确核心概念的定义和边界，这将有助于后续分析的准确性。其次，通过引入相关的案例和数据支撑，可以使论述更加充实和有说服力。',
      '接下来的内容将围绕以下几个关键点展开：第一，深入分析当前存在的问题和挑战；第二，提出切实可行的解决方案；第三，评估各种方案的优劣并给出建议。',
      '这不仅是一个技术问题，更是一个需要综合考虑用户体验、业务目标和实现成本的系统性挑战。因此，在制定策略时，我们需要从多个维度进行权衡。',
    ]
    return continuations[Math.floor(Math.random() * continuations.length)]
  },

  polish: (text) =>
    `以下是润色后的版本：\n\n${text.replace(/。/g, '。\n\n').trim()}\n\n这段文字经过优化后，表达更加清晰流畅，逻辑结构更加严谨，读者可以更容易地理解核心观点。`,

  'translate-en': (text) =>
    `Here is the English translation:\n\n${text}\n\n(Translated to natural, fluent English while preserving the original meaning and tone.)`,

  'translate-zh': (_text) =>
    `以下是中文翻译：\n\n${_text}\n\n（已翻译为自然流畅的中文，同时保留了原文的含义和语气。）`,

  summarize: (text) =>
    `总结如下：\n\n• 核心观点：${text.slice(0, 30)}...\n• 主要论据：文中从多个角度进行了论述\n• 结论：建议采取综合性的解决方案\n\n这段内容的核心在于强调系统性思考的重要性，以及在实际应用中平衡各种因素的必要性。`,

  explain: (_text) =>
    `解释如下：\n\n这段内容的核心含义是探讨在复杂系统中如何有效地协调各个组成部分。具体来说：\n\n1. **背景**：当前面临的是一个多变量、多约束的问题\n2. **核心概念**：需要理解系统思维（Systems Thinking）的基本原理\n3. **应用**：将这些原理应用到实际场景中，可以显著提升效率和效果\n4. **启示**：在面对类似问题时，建议采用结构化的分析方法`,

  shorter: (_text) => {
    const short = _text.length > 20 ? _text.slice(0, 20) + '...' : _text
    return `精简版本：\n\n${short}\n\n（原文已精简为更简洁的表达，保留了核心信息。）`
  },

  longer: (text) =>
    `扩展版本：\n\n${text}\n\n为了更全面地阐述这一观点，我们还可以从以下角度进行补充说明。第一，历史背景方面，类似的问题在过去也曾出现，当时的解决方案为我们提供了宝贵的经验。第二，从理论层面来看，相关的学术研究成果可以为我们提供更深入的理解。第三，在实践中，不同行业和场景的具体应用也展示了这一方法的普适性和灵活性。`,

  professional: (text) =>
    `专业版本：\n\n${text}\n\n经专业润色后，上述内容采用了更加规范的学术/商务用语，句式结构更加严谨，适合用于正式文档、报告或对外沟通场景。`,

  casual: (text) =>
    `轻松版本：\n\n${text}\n\n简单来说，就是上面这些内容。用更接地气的方式讲，核心意思没变，但读起来更轻松自然，适合日常沟通或非正式场合使用。`,

  custom: (text) => text,
}

/**
 * 模拟流式 AI 响应
 * 返回 AsyncGenerator，每次 yield 一个字符/词片段
 */
export async function* streamAIResponse(
  request: AIRequest
): AsyncGenerator<string, void, unknown> {
  const { action, text, customPrompt } = request

  // 模拟网络延迟
  await delay(300 + Math.random() * 400)

  let fullText: string

  if (action === 'custom' && customPrompt) {
    fullText = `根据您的要求「${customPrompt}」：\n\n${text}\n\n（这是模拟的 AI 自定义响应。在实际项目中，这里会调用真实的 AI API，如 OpenAI GPT-4、Claude 或 Kimi 等。）`
  } else {
    fullText = templates[action](text)
  }

  // 流式输出：每次输出 1-3 个字符
  let idx = 0
  while (idx < fullText.length) {
    const chunkSize = 1 + Math.floor(Math.random() * 2)
    const chunk = fullText.slice(idx, idx + chunkSize)
    yield chunk
    idx += chunkSize
    // 模拟打字延迟
    await delay(15 + Math.random() * 35)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
