package sevoniva.memorica.repository;

import sevoniva.memorica.entity.DocumentPermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentPermissionRepository extends JpaRepository<DocumentPermission, Long> {

    List<DocumentPermission> findByDocumentId(String documentId);

    List<DocumentPermission> findByUserId(Long userId);

    Optional<DocumentPermission> findByDocumentIdAndUserId(String documentId, Long userId);

    boolean existsByDocumentIdAndUserId(String documentId, Long userId);

    void deleteByDocumentIdAndUserId(String documentId, Long userId);

    void deleteByDocumentId(String documentId);
}
