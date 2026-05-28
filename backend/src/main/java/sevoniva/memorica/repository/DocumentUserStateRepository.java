package sevoniva.memorica.repository;

import sevoniva.memorica.entity.DocumentUserState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DocumentUserStateRepository extends JpaRepository<DocumentUserState, Long> {
    Optional<DocumentUserState> findByDocumentIdAndUserId(String documentId, Long userId);
    Page<DocumentUserState> findByUserIdAndIsFavoriteTrueOrderByUpdatedAtDesc(Long userId, Pageable pageable);
    Page<DocumentUserState> findByUserIdAndLastOpenedAtIsNotNullOrderByLastOpenedAtDesc(Long userId, Pageable pageable);

    @Modifying
    @Query(value = """
            INSERT INTO document_user_states (document_id, user_id, is_favorite, last_opened_at, created_at, updated_at)
            VALUES (:documentId, :userId, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (document_id, user_id)
            DO UPDATE SET last_opened_at = EXCLUDED.last_opened_at,
                          updated_at = EXCLUDED.updated_at
            """, nativeQuery = true)
    void upsertLastOpened(@Param("documentId") String documentId, @Param("userId") Long userId);

    @Modifying
    @Query(value = """
            INSERT INTO document_user_states (document_id, user_id, is_favorite, created_at, updated_at)
            VALUES (:documentId, :userId, :favorite, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (document_id, user_id)
            DO UPDATE SET is_favorite = EXCLUDED.is_favorite,
                          updated_at = EXCLUDED.updated_at
            """, nativeQuery = true)
    void upsertFavorite(@Param("documentId") String documentId,
                        @Param("userId") Long userId,
                        @Param("favorite") boolean favorite);
}
