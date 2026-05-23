package sevoniva.memorica.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DocumentVersionResponse {
    private Long id;
    private Integer versionNumber;
    private String editorName;
    private Integer wordCount;
    private Integer charCount;
    private LocalDateTime createdAt;
}
