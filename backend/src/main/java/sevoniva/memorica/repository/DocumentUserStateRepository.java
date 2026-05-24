package sevoniva.memorica.repository;

import sevoniva.memorica.entity.DocumentUserState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DocumentUserStateRepository extends JpaRepository<DocumentUserState, Long> {
    Optional<DocumentUserState> findByDocumentIdAndUserId(String documentId, Long userId);
    Page<DocumentUserState> findByUserIdAndIsFavoriteTrueOrderByUpdatedAtDesc(Long userId, Pageable pageable);
    Page<DocumentUserState> findByUserIdAndLastOpenedAtIsNotNullOrderByLastOpenedAtDesc(Long userId, Pageable pageable);
}
