package sevoniva.memorica.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SecurityConfigTest {

    @Test
    void corsConfigurationSourceShouldRejectWildcardAllowedOrigins() {
        SecurityConfig config = configWithCors("*", "");

        assertThrows(IllegalStateException.class, config::corsConfigurationSource);
    }

    @Test
    void corsConfigurationSourceShouldRejectWildcardAllowedOriginPatterns() {
        SecurityConfig config = configWithCors("http://localhost:5173", "*");

        assertThrows(IllegalStateException.class, config::corsConfigurationSource);
    }

    @Test
    void corsConfigurationSourceShouldAllowControlledPreviewPattern() {
        SecurityConfig config = configWithCors("http://localhost:5173", "https://*.pages.dev");

        assertDoesNotThrow(config::corsConfigurationSource);
    }

    private SecurityConfig configWithCors(String origins, String originPatterns) {
        SecurityConfig config = new SecurityConfig(null, null);
        ReflectionTestUtils.setField(config, "allowedOrigins", origins);
        ReflectionTestUtils.setField(config, "allowedOriginPatterns", originPatterns);
        return config;
    }
}
