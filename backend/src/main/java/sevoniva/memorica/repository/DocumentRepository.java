package sevoniva.memorica.repository;

import sevoniva.memorica.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, String> {
    List<Document> findByOwnerIdOrderByUpdatedAtDesc(Long ownerId);
    Page<Document> findByOwnerIdAndDeletedAtIsNull(Long ownerId, Pageable pageable);
    Page<Document> findByOwnerIdAndDeletedAtIsNullAndParentIdIsNull(Long ownerId, Pageable pageable);
    Page<Document> findByOwnerIdAndDeletedAtIsNullAndParentId(Long ownerId, String parentId, Pageable pageable);
    Page<Document> findByOwnerIdAndDeletedAtIsNotNull(Long ownerId, Pageable pageable);
    Page<Document> findByOwnerIdAndDeletedAtIsNullAndTitleContainingIgnoreCase(Long ownerId, String title, Pageable pageable);
    Page<Document> findByWorkspaceIdAndDeletedAtIsNull(String workspaceId, Pageable pageable);
    Page<Document> findByWorkspaceIdAndDeletedAtIsNullAndParentIdIsNull(String workspaceId, Pageable pageable);
    Page<Document> findByWorkspaceIdAndDeletedAtIsNullAndParentId(String workspaceId, String parentId, Pageable pageable);
    Page<Document> findByWorkspaceIdAndDeletedAtIsNullAndTitleContainingIgnoreCase(String workspaceId, String title, Pageable pageable);
    List<Document> findByParentIdAndDeletedAtIsNull(String parentId);
    List<Document> findByParentId(String parentId);
    List<Document> findByWorkspaceIdAndDeletedAtIsNullAndItemTypeOrderByTitleAsc(String workspaceId, String itemType);
    List<Document> findByIsPublicTrueOrderByUpdatedAtDesc();
    Page<Document> findByIsPublicTrueAndDeletedAtIsNull(Pageable pageable);
    Page<Document> findByIsPublicTrueAndDeletedAtIsNullAndTitleContainingIgnoreCase(String title, Pageable pageable);

    @Query("""
            select d from Document d
            join DocumentPermission p on p.documentId = d.id
            where p.userId = :userId
              and p.role <> :ownerRole
              and d.deletedAt is null
              and d.owner.id <> :userId
            """)
    Page<Document> findSharedWithUser(@Param("userId") Long userId,
                                      @Param("ownerRole") String ownerRole,
                                      Pageable pageable);

    @Query("""
            select d from Document d
            join DocumentPermission p on p.documentId = d.id
            where p.userId = :userId
              and p.role <> :ownerRole
              and d.deletedAt is null
              and d.owner.id <> :userId
              and lower(d.title) like lower(concat('%', :query, '%'))
            """)
    Page<Document> findSharedWithUserByTitleContaining(@Param("userId") Long userId,
                                      @Param("ownerRole") String ownerRole,
                                      @Param("query") String query,
                                      Pageable pageable);
}
