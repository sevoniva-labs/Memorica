package sevoniva.memorica.service.ai;

public interface AiProvider {
    String name();

    AiCompletionResponse generate(AiCompletionRequest request);
}
