package sevoniva.memorica.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DocumentResponse {
    private String id;
    private String title;
    private String ownerName;
    private String workspaceId;
    private String parentId;
    private String itemType;
    private Integer wordCount;
    private Integer charCount;
    private Boolean isPublic;
    private Boolean isFavorite;
    private String coverImage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastOpenedAt;
    private LocalDateTime deletedAt;
}
