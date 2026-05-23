package sevoniva.memorica.repository;

import sevoniva.memorica.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, String> {
    List<Document> findByOwnerIdOrderByUpdatedAtDesc(Long ownerId);
    Page<Document> findByOwnerId(Long ownerId, Pageable pageable);
    List<Document> findByIsPublicTrueOrderByUpdatedAtDesc();
    Page<Document> findByIsPublicTrue(Pageable pageable);
}
