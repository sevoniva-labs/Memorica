package sevoniva.memorica.dto;

import org.slf4j.MDC;

import java.time.Instant;

public record ErrorResponse(
    String error,
    String message,
    String traceId,
    Instant timestamp
) {
    public static ErrorResponse of(String error, String message) {
        return new ErrorResponse(error, message, MDC.get("traceId"), Instant.now());
    }
}
