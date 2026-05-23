package com.collabdoc.service;

import com.collabdoc.dto.*;
import com.collabdoc.entity.Document;
import com.collabdoc.entity.DocumentVersion;
import com.collabdoc.entity.User;
import com.collabdoc.repository.DocumentRepository;
import com.collabdoc.repository.DocumentVersionRepository;
import com.collabdoc.repository.UserRepository;
import com.collabdoc.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentVersionRepository documentVersionRepository;

    @Autowired
    private UserRepository userRepository;

    public ApiResponse<List<DocumentResponse>> listMyDocuments() {
        User user = getCurrentUser();
        List<Document> docs = documentRepository.findByOwnerIdOrderByUpdatedAtDesc(user.getId());
        return ApiResponse.success(docs.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    public ApiResponse<List<DocumentResponse>> listPublicDocuments() {
        List<Document> docs = documentRepository.findByIsPublicTrueOrderByUpdatedAtDesc();
        return ApiResponse.success(docs.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    public ApiResponse<DocumentResponse> createDocument(String title) {
        User user = getCurrentUser();
        Document doc = Document.builder()
                .id(UUID.randomUUID().toString())
                .title(title != null && !title.isBlank() ? title : "未命名文档")
                .owner(user)
                .ownerName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .wordCount(0)
                .charCount(0)
                .isPublic(false)
                .build();
        documentRepository.save(doc);
        return ApiResponse.success(toResponse(doc));
    }

    public ApiResponse<DocumentResponse> getDocument(String id) {
        Document doc = documentRepository.findById(id).orElse(null);
        if (doc == null) return ApiResponse.error("文档不存在");
        return ApiResponse.success(toResponse(doc));
    }

    public ApiResponse<?> updateDocumentMeta(String id, String title, Boolean isPublic) {
        Document doc = documentRepository.findById(id).orElse(null);
        if (doc == null) return ApiResponse.error("文档不存在");
        if (title != null && !title.isBlank()) doc.setTitle(title);
        if (isPublic != null) doc.setIsPublic(isPublic);
        documentRepository.save(doc);
        return ApiResponse.success(toResponse(doc));
    }

    public ApiResponse<?> deleteDocument(String id) {
        documentRepository.deleteById(id);
        return ApiResponse.success(null);
    }

    public ApiResponse<?> saveVersion(String documentId, String contentJson, String snapshotHtml, Integer wordCount, Integer charCount) {
        User user = getCurrentUser();
        var lastVersion = documentVersionRepository.findTopByDocumentIdOrderByVersionNumberDesc(documentId);
        int nextVersion = lastVersion.map(v -> v.getVersionNumber() + 1).orElse(1);

        DocumentVersion version = DocumentVersion.builder()
                .documentId(documentId)
                .versionNumber(nextVersion)
                .contentJson(contentJson)
                .snapshotHtml(snapshotHtml)
                .wordCount(wordCount)
                .charCount(charCount)
                .editorName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .build();
        documentVersionRepository.save(version);

        // 更新文档元数据
        Document doc = documentRepository.findById(documentId).orElse(null);
        if (doc != null) {
            doc.setWordCount(wordCount);
            doc.setCharCount(charCount);
            documentRepository.save(doc);
        }

        return ApiResponse.success(Map.of("version", nextVersion));
    }

    public ApiResponse<List<DocumentVersionResponse>> listVersions(String documentId) {
        List<DocumentVersion> versions = documentVersionRepository.findByDocumentIdOrderByVersionNumberDesc(documentId);
        return ApiResponse.success(versions.stream()
                .map(v -> DocumentVersionResponse.builder()
                        .id(v.getId())
                        .versionNumber(v.getVersionNumber())
                        .editorName(v.getEditorName())
                        .wordCount(v.getWordCount())
                        .charCount(v.getCharCount())
                        .createdAt(v.getCreatedAt())
                        .build())
                .collect(Collectors.toList()));
    }

    public ApiResponse<?> getVersion(Long versionId) {
        DocumentVersion v = documentVersionRepository.findById(versionId).orElse(null);
        if (v == null) return ApiResponse.error("版本不存在");
        return ApiResponse.success(Map.of(
            "id", v.getId(),
            "versionNumber", v.getVersionNumber(),
            "contentJson", v.getContentJson(),
            "snapshotHtml", v.getSnapshotHtml(),
            "editorName", v.getEditorName(),
            "createdAt", v.getCreatedAt()
        ));
    }

    private DocumentResponse toResponse(Document doc) {
        return DocumentResponse.builder()
                .id(doc.getId())
                .title(doc.getTitle())
                .ownerName(doc.getOwnerName())
                .wordCount(doc.getWordCount())
                .charCount(doc.getCharCount())
                .coverImage(doc.getCoverImage())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .build();
    }

    private User getCurrentUser() {
        UserDetailsImpl details = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(details.getId()).orElseThrow();
    }
}
