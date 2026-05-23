package com.collabdoc.repository;

import com.collabdoc.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, Long> {
    List<DocumentVersion> findByDocumentIdOrderByVersionNumberDesc(String documentId);
    Optional<DocumentVersion> findTopByDocumentIdOrderByVersionNumberDesc(String documentId);
}
