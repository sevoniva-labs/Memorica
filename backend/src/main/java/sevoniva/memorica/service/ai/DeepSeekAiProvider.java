package sevoniva.memorica.service.ai;

import sevoniva.memorica.config.AiProperties;
import sevoniva.memorica.exception.AiProviderUnavailableException;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

@Component
public class DeepSeekAiProvider implements AiProvider {

    private static final String PROVIDER_NAME = "deepseek";

    private final AiProperties properties;
    private final AiPromptBuilder promptBuilder;
    private final RestClient.Builder restClientBuilder;

    public DeepSeekAiProvider(AiProperties properties,
                              AiPromptBuilder promptBuilder,
                              RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.promptBuilder = promptBuilder;
        this.restClientBuilder = restClientBuilder;
    }

    @Override
    public String name() {
        return PROVIDER_NAME;
    }

    @Override
    public AiCompletionResponse generate(AiCompletionRequest request) {
        AiProperties.DeepSeek config = properties.getDeepseek();
        if (config.getApiKey() == null || config.getApiKey().isBlank()) {
            throw new AiProviderUnavailableException("DeepSeek API Key 未配置");
        }

        RestClient client = restClientBuilder
                .baseUrl(trimTrailingSlash(config.getBaseUrl()))
                .requestFactory(requestFactory(config))
                .build();

        Map<String, Object> payload = Map.of(
                "model", config.getModel(),
                "temperature", config.getTemperature(),
                "messages", List.of(
                        Map.of("role", "system", "content", "你是严谨、简洁、可靠的中文写作助手。"),
                        Map.of("role", "user", "content", promptBuilder.build(request))
                )
        );

        DeepSeekChatResponse response;
        try {
            response = client.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> headers.setBearerAuth(config.getApiKey()))
                    .body(payload)
                    .retrieve()
                    .body(DeepSeekChatResponse.class);
        } catch (RestClientException e) {
            throw new AiProviderUnavailableException("AI 服务调用失败");
        }

        String text = extractText(response);
        return new AiCompletionResponse(PROVIDER_NAME, config.getModel(), text);
    }

    private String extractText(DeepSeekChatResponse response) {
        if (response == null || response.choices() == null || response.choices().isEmpty()) {
            throw new AiProviderUnavailableException("AI 服务未返回有效内容");
        }
        String content = response.choices().get(0).message().content();
        if (content == null || content.isBlank()) {
            throw new AiProviderUnavailableException("AI 服务返回内容为空");
        }
        return content.trim();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "https://api.deepseek.com";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private SimpleClientHttpRequestFactory requestFactory(AiProperties.DeepSeek config) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(config.getTimeout());
        factory.setReadTimeout(config.getTimeout());
        return factory;
    }

    private record DeepSeekChatResponse(List<Choice> choices) {
    }

    private record Choice(Message message) {
    }

    private record Message(String content) {
    }
}
