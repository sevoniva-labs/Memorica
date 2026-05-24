package sevoniva.memorica.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WorkspaceMemberResponse {
    private Long userId;
    private String username;
    private String displayName;
    private String email;
    private String role;
    private LocalDateTime joinedAt;
}
