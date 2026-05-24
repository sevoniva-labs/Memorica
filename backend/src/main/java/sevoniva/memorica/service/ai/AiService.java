package sevoniva.memorica.service.ai;

import sevoniva.memorica.config.AiProperties;
import sevoniva.memorica.dto.AiGenerateRequest;
import sevoniva.memorica.dto.AiGenerateResponse;
import sevoniva.memorica.exception.AiProviderUnavailableException;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AiService {

    private final AiProperties properties;
    private final Map<String, AiProvider> providers;

    public AiService(AiProperties properties, java.util.List<AiProvider> providers) {
        this.properties = properties;
        this.providers = providers.stream()
                .collect(Collectors.toMap(provider -> provider.name().toLowerCase(Locale.ROOT), Function.identity()));
    }

    public AiGenerateResponse generate(AiGenerateRequest request) {
        AiProvider provider = providers.get(properties.getProvider().toLowerCase(Locale.ROOT));
        if (provider == null) {
            throw new AiProviderUnavailableException("AI provider 不存在: " + properties.getProvider());
        }

        String text = truncate(request.getText(), properties.getMaxInputChars());
        AiCompletionResponse response = provider.generate(new AiCompletionRequest(
                request.getAction(),
                text,
                request.getCustomPrompt()
        ));

        return AiGenerateResponse.builder()
                .provider(response.provider())
                .model(response.model())
                .text(response.text())
                .build();
    }

    private String truncate(String value, int maxChars) {
        if (value == null || value.length() <= maxChars) {
            return value;
        }
        return value.substring(0, maxChars);
    }
}
