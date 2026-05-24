package sevoniva.memorica.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class InviteWorkspaceMemberRequest {
    @NotBlank
    private String username;

    @NotBlank
    @Pattern(regexp = "admin|member", message = "角色只能是 admin 或 member")
    private String role;
}
