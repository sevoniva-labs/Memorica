package sevoniva.memorica.repository;

import sevoniva.memorica.entity.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {
    List<WorkspaceMember> findByUserIdOrderByCreatedAtAsc(Long userId);
    List<WorkspaceMember> findByWorkspaceIdOrderByCreatedAtAsc(String workspaceId);
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(String workspaceId, Long userId);
    boolean existsByWorkspaceIdAndUserId(String workspaceId, Long userId);
}
