package sevoniva.memorica.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiGenerateRequest {
    private String documentId;

    @NotBlank
    private String action;

    @NotBlank
    @Size(max = 8000)
    private String text;

    @Size(max = 1000)
    private String customPrompt;
}
