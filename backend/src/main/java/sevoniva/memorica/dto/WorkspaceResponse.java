package sevoniva.memorica.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WorkspaceResponse {
    private String id;
    private String name;
    private String role;
    private LocalDateTime createdAt;
}
