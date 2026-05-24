package sevoniva.memorica.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MoveDocumentRequest {
    @Size(max = 64, message = "父级目录标识长度不能超过 64 个字符")
    private String parentId;
}
