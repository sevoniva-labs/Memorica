package sevoniva.memorica.service;

import sevoniva.memorica.dto.*;
import sevoniva.memorica.entity.Document;
import sevoniva.memorica.entity.DocumentVersion;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.exception.AccessDeniedException;
import sevoniva.memorica.exception.ResourceNotFoundException;
import sevoniva.memorica.repository.DocumentRepository;
import sevoniva.memorica.repository.DocumentVersionRepository;
import sevoniva.memorica.repository.UserRepository;
import sevoniva.memorica.security.UserDetailsImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class DocumentService {

    private static final String DEFAULT_TITLE = "未命名文档";

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public DocumentService(DocumentRepository documentRepository,
                           DocumentVersionRepository documentVersionRepository,
                           UserRepository userRepository,
                           PermissionService permissionService) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
    }

    public ApiResponse<Page<DocumentResponse>> listMyDocuments(int page, int size) {
        User user = getCurrentUser();
        PageRequest pr = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Document> docs = documentRepository.findByOwnerId(user.getId(), pr);
        return ApiResponse.success(docs.map(this::toResponse));
    }

    public ApiResponse<Page<DocumentResponse>> listPublicDocuments(int page, int size) {
        PageRequest pr = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Document> docs = documentRepository.findByIsPublicTrue(pr);
        return ApiResponse.success(docs.map(this::toResponse));
    }

    @Transactional
    public ApiResponse<DocumentResponse> createDocument(String title) {
        User user = getCurrentUser();
        Document doc = Document.builder()
                .id(UUID.randomUUID().toString())
                .title(title != null && !title.isBlank() ? title : DEFAULT_TITLE)
                .owner(user)
                .ownerName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .wordCount(0)
                .charCount(0)
                .isPublic(false)
                .build();
        documentRepository.save(doc);
        permissionService.grantOwner(doc, user);
        return ApiResponse.success(toResponse(doc));
    }

    public ApiResponse<DocumentResponse> getDocument(String id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        return ApiResponse.success(toResponse(doc));
    }

    @Transactional
    public ApiResponse<DocumentResponse> updateDocumentMeta(String id, String title, Boolean isPublic) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkOwnership(doc);
        if (title != null && !title.isBlank()) {
            doc.setTitle(title);
        }
        if (isPublic != null) {
            doc.setIsPublic(isPublic);
        }
        documentRepository.save(doc);
        return ApiResponse.success(toResponse(doc));
    }

    @Transactional
    public ApiResponse<Void> deleteDocument(String id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkOwnership(doc);
        documentRepository.delete(doc);
        return ApiResponse.success(null);
    }

    @Transactional
    public ApiResponse<?> saveVersion(String documentId, String contentJson, String snapshotHtml,
                                       Integer wordCount, Integer charCount) {
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

        Document doc = documentRepository.findById(documentId).orElse(null);
        if (doc != null) {
            doc.setWordCount(wordCount);
            doc.setCharCount(charCount);
            documentRepository.save(doc);
        }

        return ApiResponse.success(Map.of("version", nextVersion));
    }

    public ApiResponse<Page<DocumentVersionResponse>> listVersions(String documentId, int page, int size) {
        PageRequest pr = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "versionNumber"));
        Page<DocumentVersion> versions = documentVersionRepository.findByDocumentId(documentId, pr);
        return ApiResponse.success(versions.map(v -> DocumentVersionResponse.builder()
                .id(v.getId())
                .versionNumber(v.getVersionNumber())
                .editorName(v.getEditorName())
                .wordCount(v.getWordCount())
                .charCount(v.getCharCount())
                .createdAt(v.getCreatedAt())
                .build()));
    }

    public ApiResponse<?> getVersion(Long versionId) {
        DocumentVersion v = documentVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("版本不存在"));
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

    private void checkOwnership(Document doc) {
        User currentUser = getCurrentUser();
        if (!doc.getOwner().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("无权操作该文档");
        }
    }

    private User getCurrentUser() {
        UserDetailsImpl details = (UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return userRepository.findById(details.getId()).orElseThrow();
    }
}
