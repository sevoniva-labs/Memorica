package sevoniva.memorica.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshTokenRequest {
    @NotBlank(message = "Refresh token 不能为空")
    private String refreshToken;
}
