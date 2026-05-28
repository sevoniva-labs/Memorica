package sevoniva.memorica.repository;

import sevoniva.memorica.entity.UploadedFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long> {
    Optional<UploadedFile> findByObjectName(String objectName);
    List<UploadedFile> findTop100ByDocumentIdIsNullAndCreatedAtBefore(LocalDateTime createdAt);
}
