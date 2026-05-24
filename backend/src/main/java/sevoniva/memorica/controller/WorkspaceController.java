package sevoniva.memorica.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import sevoniva.memorica.dto.ApiResponse;
import sevoniva.memorica.dto.InviteWorkspaceMemberRequest;
import sevoniva.memorica.dto.WorkspaceMemberResponse;
import sevoniva.memorica.dto.WorkspaceResponse;
import sevoniva.memorica.service.WorkspaceService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    public WorkspaceController(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @GetMapping
    public ApiResponse<List<WorkspaceResponse>> listMine() {
        return workspaceService.listMine();
    }

    @GetMapping("/{workspaceId}/members")
    public ApiResponse<List<WorkspaceMemberResponse>> listMembers(@PathVariable String workspaceId) {
        return workspaceService.listMembers(workspaceId);
    }

    @PostMapping("/{workspaceId}/members")
    public ApiResponse<List<WorkspaceMemberResponse>> inviteMember(
            @PathVariable String workspaceId,
            @Valid @RequestBody InviteWorkspaceMemberRequest request) {
        return workspaceService.inviteMember(workspaceId, request.getUsername(), request.getRole());
    }

    @DeleteMapping("/{workspaceId}/members/{userId}")
    public ApiResponse<List<WorkspaceMemberResponse>> removeMember(
            @PathVariable String workspaceId,
            @PathVariable Long userId) {
        return workspaceService.removeMember(workspaceId, userId);
    }
}
