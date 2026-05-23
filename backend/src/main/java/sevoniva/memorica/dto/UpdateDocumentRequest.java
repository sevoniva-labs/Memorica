package sevoniva.memorica.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateDocumentRequest {
    @Size(max = 255, message = "标题长度不能超过 255 个字符")
    private String title;

    private Boolean isPublic;
}
