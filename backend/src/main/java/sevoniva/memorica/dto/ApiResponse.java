package sevoniva.memorica.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ApiResponse<T> {
    private T data;

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder().data(data).build();
    }

    public static <T> ApiResponse<T> error(String message) {
        // Kept for backwards compat; prefer throwing exceptions handled by GlobalExceptionHandler
        return ApiResponse.<T>builder().data(null).build();
    }
}
