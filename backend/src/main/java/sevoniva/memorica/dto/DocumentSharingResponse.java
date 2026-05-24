package sevoniva.memorica.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DocumentSharingResponse {
    private String documentId;
    private String workspaceId;
    private String workspaceName;
    private Boolean isPublic;
    private List<DocumentSharingMemberResponse> members;
    private List<WorkspaceMemberResponse> workspaceMembers;
}
