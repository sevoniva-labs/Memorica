package sevoniva.memorica.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.ai")
public class AiProperties {

    private String provider = "deepseek";
    private int maxInputChars = 8000;
    private DeepSeek deepseek = new DeepSeek();

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public int getMaxInputChars() {
        return maxInputChars;
    }

    public void setMaxInputChars(int maxInputChars) {
        this.maxInputChars = maxInputChars;
    }

    public DeepSeek getDeepseek() {
        return deepseek;
    }

    public void setDeepseek(DeepSeek deepseek) {
        this.deepseek = deepseek;
    }

    public static class DeepSeek {
        private String apiKey = "";
        private String baseUrl = "https://api.deepseek.com";
        private String model = "deepseek-v4-flash";
        private String thinking = "disabled";
        private Duration timeout = Duration.ofSeconds(45);
        private double temperature = 0.4;

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public String getThinking() {
            return thinking;
        }

        public void setThinking(String thinking) {
            this.thinking = thinking;
        }

        public Duration getTimeout() {
            return timeout;
        }

        public void setTimeout(Duration timeout) {
            this.timeout = timeout;
        }

        public double getTemperature() {
            return temperature;
        }

        public void setTemperature(double temperature) {
            this.temperature = temperature;
        }
    }
}
