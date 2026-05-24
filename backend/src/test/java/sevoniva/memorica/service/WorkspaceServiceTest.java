package sevoniva.memorica.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.entity.Workspace;
import sevoniva.memorica.entity.WorkspaceMember;
import sevoniva.memorica.exception.AccessDeniedException;
import sevoniva.memorica.repository.UserRepository;
import sevoniva.memorica.repository.WorkspaceMemberRepository;
import sevoniva.memorica.repository.WorkspaceRepository;
import sevoniva.memorica.security.UserDetailsImpl;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceServiceTest {

    @Mock
    private WorkspaceRepository workspaceRepository;
    @Mock
    private WorkspaceMemberRepository memberRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditService auditService;

    private WorkspaceService workspaceService;
    private User owner;

    @BeforeEach
    void setUp() {
        workspaceService = new WorkspaceService(workspaceRepository, memberRepository, userRepository, auditService);
        owner = User.builder()
                .id(1L)
                .username("owner")
                .displayName("Owner")
                .email("owner@example.com")
                .color("#245bdb")
                .build();
        UserDetailsImpl userDetails = UserDetailsImpl.build(owner);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void ensurePersonalWorkspace_shouldCreateWorkspaceAndOwnerMembership() {
        when(workspaceRepository.findById("personal-1")).thenReturn(Optional.empty());
        when(workspaceRepository.save(any(Workspace.class))).thenAnswer(inv -> inv.getArgument(0));
        when(memberRepository.findByWorkspaceIdAndUserId("personal-1", 1L)).thenReturn(Optional.empty());
        when(memberRepository.save(any(WorkspaceMember.class))).thenAnswer(inv -> inv.getArgument(0));

        Workspace workspace = workspaceService.ensurePersonalWorkspace(owner);

        assertEquals("personal-1", workspace.getId());
        assertEquals("Owner 的空间", workspace.getName());
        verify(memberRepository).save(argThat(member ->
                "personal-1".equals(member.getWorkspaceId())
                        && Long.valueOf(1L).equals(member.getUserId())
                        && WorkspaceMember.ROLE_OWNER.equals(member.getRole())));
    }

    @Test
    void inviteMember_shouldAddMemberWhenCurrentUserIsOwner() {
        User target = User.builder()
                .id(2L)
                .username("collab")
                .displayName("Collab")
                .email("collab@example.com")
                .color("#22c55e")
                .build();
        Workspace workspace = Workspace.builder().id("personal-1").name("Owner 的空间").owner(owner).build();
        WorkspaceMember ownerMember = WorkspaceMember.builder()
                .workspaceId("personal-1")
                .userId(1L)
                .role(WorkspaceMember.ROLE_OWNER)
                .build();
        WorkspaceMember targetMember = WorkspaceMember.builder()
                .workspaceId("personal-1")
                .userId(2L)
                .role(WorkspaceMember.ROLE_MEMBER)
                .build();

        when(memberRepository.findByWorkspaceIdAndUserId("personal-1", 1L)).thenReturn(Optional.of(ownerMember));
        when(userRepository.findByUsername("collab")).thenReturn(Optional.of(target));
        when(workspaceRepository.findById("personal-1")).thenReturn(Optional.of(workspace));
        when(memberRepository.findByWorkspaceIdAndUserId("personal-1", 2L)).thenReturn(Optional.empty());
        when(memberRepository.save(any(WorkspaceMember.class))).thenAnswer(inv -> inv.getArgument(0));
        when(memberRepository.existsByWorkspaceIdAndUserId("personal-1", 1L)).thenReturn(true);
        when(memberRepository.findByWorkspaceIdOrderByCreatedAtAsc("personal-1"))
                .thenReturn(List.of(ownerMember, targetMember));
        when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));

        var result = workspaceService.inviteMember("personal-1", "collab", WorkspaceMember.ROLE_MEMBER);

        assertEquals(2, result.getData().size());
        verify(memberRepository).save(argThat(member ->
                "personal-1".equals(member.getWorkspaceId())
                        && Long.valueOf(2L).equals(member.getUserId())
                        && WorkspaceMember.ROLE_MEMBER.equals(member.getRole())));
        verify(auditService).log(eq(1L), eq("owner"), eq("WORKSPACE_MEMBER_INVITE"),
                eq("WORKSPACE"), eq("personal-1"), contains("collab"), isNull());
    }

    @Test
    void inviteMember_shouldDenyChangingOwnerRole() {
        Workspace workspace = Workspace.builder().id("personal-1").name("Owner 的空间").owner(owner).build();
        WorkspaceMember ownerMember = WorkspaceMember.builder()
                .workspaceId("personal-1")
                .userId(1L)
                .role(WorkspaceMember.ROLE_OWNER)
                .build();

        when(memberRepository.findByWorkspaceIdAndUserId("personal-1", 1L)).thenReturn(Optional.of(ownerMember));
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(owner));
        when(workspaceRepository.findById("personal-1")).thenReturn(Optional.of(workspace));

        assertThrows(AccessDeniedException.class,
                () -> workspaceService.inviteMember("personal-1", "owner", WorkspaceMember.ROLE_MEMBER));
        verify(memberRepository, never()).save(any());
    }

    @Test
    void removeMember_shouldDeleteMemberWhenCurrentUserIsOwner() {
        User target = User.builder()
                .id(2L)
                .username("collab")
                .displayName("Collab")
                .email("collab@example.com")
                .color("#22c55e")
                .build();
        Workspace workspace = Workspace.builder().id("personal-1").name("Owner 的空间").owner(owner).build();
        WorkspaceMember ownerMember = WorkspaceMember.builder()
                .workspaceId("personal-1")
                .userId(1L)
                .role(WorkspaceMember.ROLE_OWNER)
                .build();
        WorkspaceMember targetMember = WorkspaceMember.builder()
                .workspaceId("personal-1")
                .userId(2L)
                .role(WorkspaceMember.ROLE_MEMBER)
                .build();

        when(memberRepository.findByWorkspaceIdAndUserId("personal-1", 1L)).thenReturn(Optional.of(ownerMember));
        when(workspaceRepository.findById("personal-1")).thenReturn(Optional.of(workspace));
        when(memberRepository.findByWorkspaceIdAndUserId("personal-1", 2L)).thenReturn(Optional.of(targetMember));
        when(memberRepository.existsByWorkspaceIdAndUserId("personal-1", 1L)).thenReturn(true);
        when(memberRepository.findByWorkspaceIdOrderByCreatedAtAsc("personal-1")).thenReturn(List.of(ownerMember));
        when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

        var result = workspaceService.removeMember("personal-1", 2L);

        assertEquals(1, result.getData().size());
        verify(memberRepository).delete(targetMember);
        verify(auditService).log(eq(1L), eq("owner"), eq("WORKSPACE_MEMBER_REMOVE"),
                eq("WORKSPACE"), eq("personal-1"), contains("2"), isNull());
        verify(userRepository, never()).findById(2L);
    }

    @Test
    void removeMember_shouldDenyRemovingOwner() {
        Workspace workspace = Workspace.builder().id("personal-1").name("Owner 的空间").owner(owner).build();
        WorkspaceMember ownerMember = WorkspaceMember.builder()
                .workspaceId("personal-1")
                .userId(1L)
                .role(WorkspaceMember.ROLE_OWNER)
                .build();

        when(memberRepository.findByWorkspaceIdAndUserId("personal-1", 1L)).thenReturn(Optional.of(ownerMember));
        when(workspaceRepository.findById("personal-1")).thenReturn(Optional.of(workspace));

        assertThrows(AccessDeniedException.class, () -> workspaceService.removeMember("personal-1", 1L));
        verify(memberRepository, never()).delete(any());
    }
}
