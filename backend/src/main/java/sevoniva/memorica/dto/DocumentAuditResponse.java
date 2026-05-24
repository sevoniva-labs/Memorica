package sevoniva.memorica.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DocumentAuditResponse {
    private Long id;
    private String username;
    private String action;
    private String detail;
    private String traceId;
    private LocalDateTime createdAt;
}
