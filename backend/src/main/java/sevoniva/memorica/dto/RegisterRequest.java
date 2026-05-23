package sevoniva.memorica.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    @Pattern(regexp = "^[a-zA-Z0-9_-]{3,32}$", message = "用户名只能包含字母、数字、下划线和连字符，长度 3-32")
    private String username;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,128}$",
        message = "密码至少 8 位，需包含大小写字母和数字"
    )
    private String password;

    private String displayName;
    private String color;
}
