package sevoniva.memorica.service.ai;

public record AiCompletionRequest(String action, String text, String customPrompt) {
}
