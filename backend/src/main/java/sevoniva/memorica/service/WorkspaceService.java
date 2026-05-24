package sevoniva.memorica.service;

import sevoniva.memorica.dto.ApiResponse;
import sevoniva.memorica.dto.WorkspaceMemberResponse;
import sevoniva.memorica.dto.WorkspaceResponse;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.entity.Workspace;
import sevoniva.memorica.entity.WorkspaceMember;
import sevoniva.memorica.exception.AccessDeniedException;
import sevoniva.memorica.exception.BadRequestException;
import sevoniva.memorica.exception.ResourceNotFoundException;
import sevoniva.memorica.repository.UserRepository;
import sevoniva.memorica.repository.WorkspaceMemberRepository;
import sevoniva.memorica.repository.WorkspaceRepository;
import sevoniva.memorica.security.UserDetailsImpl;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public WorkspaceService(WorkspaceRepository workspaceRepository,
                            WorkspaceMemberRepository memberRepository,
                            UserRepository userRepository,
                            AuditService auditService) {
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional
    public Workspace ensurePersonalWorkspace(User user) {
        String workspaceId = personalWorkspaceId(user.getId());
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseGet(() -> workspaceRepository.save(Workspace.builder()
                        .id(workspaceId)
                        .name((user.getDisplayName() != null ? user.getDisplayName() : user.getUsername()) + " 的空间")
                        .owner(user)
                        .build()));
        memberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId())
                .orElseGet(() -> memberRepository.save(WorkspaceMember.builder()
                        .workspaceId(workspaceId)
                        .userId(user.getId())
                        .role(WorkspaceMember.ROLE_OWNER)
                        .build()));
        return workspace;
    }

    public String defaultWorkspaceId(User user) {
        return ensurePersonalWorkspace(user).getId();
    }

    public ApiResponse<List<WorkspaceResponse>> listMine() {
        Long userId = getCurrentUserId();
        List<WorkspaceResponse> workspaces = memberRepository.findByUserIdOrderByCreatedAtAsc(userId).stream()
                .map(member -> workspaceRepository.findById(member.getWorkspaceId())
                        .map(workspace -> toResponse(workspace, member.getRole()))
                        .orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();
        return ApiResponse.success(workspaces);
    }

    public ApiResponse<List<WorkspaceMemberResponse>> listMembers(String workspaceId) {
        requireMember(workspaceId);
        return ApiResponse.success(memberRepository.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId).stream()
                .map(this::toMemberResponse)
                .toList());
    }

    public String workspaceName(String workspaceId) {
        return workspaceRepository.findById(workspaceId)
                .map(Workspace::getName)
                .orElse("");
    }

    public List<WorkspaceMemberResponse> listMemberResponses(String workspaceId) {
        return memberRepository.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId).stream()
                .map(this::toMemberResponse)
                .toList();
    }

    @Transactional
    public ApiResponse<List<WorkspaceMemberResponse>> inviteMember(String workspaceId, String username, String role) {
        requireAdmin(workspaceId);
        validateAssignableRole(role);
        User target = userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("空间不存在"));
        if (workspace.getOwner().getId().equals(target.getId())) {
            throw new AccessDeniedException("不能修改空间所有者角色");
        }
        WorkspaceMember member = memberRepository.findByWorkspaceIdAndUserId(workspaceId, target.getId())
                .orElse(WorkspaceMember.builder()
                        .workspaceId(workspaceId)
                        .userId(target.getId())
                        .build());
        member.setRole(role);
        memberRepository.save(member);
        auditService.log(getCurrentUserId(), getCurrentUsername(), "WORKSPACE_MEMBER_INVITE",
                "WORKSPACE", workspaceId, "Granted " + role + " to " + target.getUsername(), null);
        return listMembers(workspaceId);
    }

    @Transactional
    public ApiResponse<List<WorkspaceMemberResponse>> removeMember(String workspaceId, Long userId) {
        requireAdmin(workspaceId);
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("空间不存在"));
        if (workspace.getOwner().getId().equals(userId)) {
            throw new AccessDeniedException("不能移除空间所有者");
        }
        WorkspaceMember member = memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("成员不存在"));
        memberRepository.delete(member);
        auditService.log(getCurrentUserId(), getCurrentUsername(), "WORKSPACE_MEMBER_REMOVE",
                "WORKSPACE", workspaceId, "Removed user " + userId, null);
        return listMembers(workspaceId);
    }

    public boolean canAccess(String workspaceId, Long userId) {
        return memberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId);
    }

    public boolean canManage(String workspaceId, Long userId) {
        return memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .map(member -> WorkspaceMember.ROLE_OWNER.equals(member.getRole())
                        || WorkspaceMember.ROLE_ADMIN.equals(member.getRole()))
                .orElse(false);
    }

    private void requireMember(String workspaceId) {
        if (!canAccess(workspaceId, getCurrentUserId())) {
            throw new AccessDeniedException("无权访问该空间");
        }
    }

    private void requireAdmin(String workspaceId) {
        WorkspaceMember member = memberRepository.findByWorkspaceIdAndUserId(workspaceId, getCurrentUserId())
                .orElseThrow(() -> new AccessDeniedException("无权管理该空间"));
        if (!WorkspaceMember.ROLE_OWNER.equals(member.getRole()) && !WorkspaceMember.ROLE_ADMIN.equals(member.getRole())) {
            throw new AccessDeniedException("无权管理该空间");
        }
    }

    private void validateAssignableRole(String role) {
        if (!WorkspaceMember.ROLE_ADMIN.equals(role) && !WorkspaceMember.ROLE_MEMBER.equals(role)) {
            throw new BadRequestException("角色只能是 admin 或 member");
        }
    }

    private WorkspaceResponse toResponse(Workspace workspace, String role) {
        return WorkspaceResponse.builder()
                .id(workspace.getId())
                .name(workspace.getName())
                .role(role)
                .createdAt(workspace.getCreatedAt())
                .build();
    }

    private WorkspaceMemberResponse toMemberResponse(WorkspaceMember member) {
        User user = userRepository.findById(member.getUserId()).orElse(null);
        return WorkspaceMemberResponse.builder()
                .userId(member.getUserId())
                .username(user != null ? user.getUsername() : "")
                .displayName(user != null ? user.getDisplayName() : "")
                .email(user != null ? user.getEmail() : "")
                .role(member.getRole())
                .joinedAt(member.getCreatedAt())
                .build();
    }

    private String personalWorkspaceId(Long userId) {
        return "personal-" + userId;
    }

    private Long getCurrentUserId() {
        UserDetailsImpl details = (UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return details.getId();
    }

    private String getCurrentUsername() {
        UserDetailsImpl details = (UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return details.getUsername();
    }
}
