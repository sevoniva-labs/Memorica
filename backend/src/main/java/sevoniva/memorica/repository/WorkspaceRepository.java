package sevoniva.memorica.repository;

import sevoniva.memorica.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkspaceRepository extends JpaRepository<Workspace, String> {
    List<Workspace> findByOwnerIdOrderByCreatedAtAsc(Long ownerId);
}
