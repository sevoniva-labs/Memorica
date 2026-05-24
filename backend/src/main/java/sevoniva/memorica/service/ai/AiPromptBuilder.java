package sevoniva.memorica.service.ai;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class AiPromptBuilder {

    private static final Map<String, String> ACTIONS = Map.ofEntries(
            Map.entry("continue", "请自然续写下面内容，保持原文语言、风格和上下文连贯。"),
            Map.entry("polish", "请润色下面内容，提升表达清晰度、流畅度和专业感，不改变原意。"),
            Map.entry("translate-en", "请把下面内容翻译成自然、准确、专业的英文。"),
            Map.entry("translate-zh", "请把下面内容翻译成自然、准确、专业的中文。"),
            Map.entry("summarize", "请总结下面内容，提炼核心观点和关键结论。"),
            Map.entry("explain", "请解释下面内容，让读者更容易理解背景、概念和含义。"),
            Map.entry("shorter", "请压缩下面内容，保留核心信息，使表达更简洁。"),
            Map.entry("longer", "请扩展下面内容，补充必要背景、细节和论证。"),
            Map.entry("professional", "请把下面内容改写为更正式、更适合商务或专业文档的表达。"),
            Map.entry("casual", "请把下面内容改写得更轻松自然，适合日常沟通。")
    );

    public String build(AiCompletionRequest request) {
        String instruction = "custom".equals(request.action())
                ? request.customPrompt()
                : ACTIONS.getOrDefault(request.action(), "请根据指令处理下面内容。");

        if (instruction == null || instruction.isBlank()) {
            instruction = "请根据上下文处理下面内容。";
        }

        return """
                你是 Memorica 文档编辑器里的写作助手。
                要求：
                - 直接输出可插入文档的正文，不要解释你的处理过程。
                - 保持用户原文的主要事实，不编造不存在的信息。
                - 如果输入是中文，默认输出中文；如果输入是英文，默认输出英文，除非指令要求翻译。

                指令：
                %s

                待处理内容：
                %s
                """.formatted(instruction.trim(), request.text().trim());
    }
}
