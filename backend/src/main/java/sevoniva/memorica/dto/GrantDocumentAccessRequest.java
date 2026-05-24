package sevoniva.memorica.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class GrantDocumentAccessRequest {
    @NotBlank
    private String username;

    @NotBlank
    @Pattern(regexp = "viewer|editor", message = "角色只能是 viewer 或 editor")
    private String role;
}
