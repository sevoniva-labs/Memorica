package sevoniva.memorica.service;

import sevoniva.memorica.dto.*;
import sevoniva.memorica.entity.Document;
import sevoniva.memorica.entity.DocumentPermission;
import sevoniva.memorica.entity.DocumentUserState;
import sevoniva.memorica.entity.DocumentVersion;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.exception.AccessDeniedException;
import sevoniva.memorica.exception.ResourceNotFoundException;
import sevoniva.memorica.repository.DocumentRepository;
import sevoniva.memorica.repository.DocumentUserStateRepository;
import sevoniva.memorica.repository.DocumentVersionRepository;
import sevoniva.memorica.repository.UserRepository;
import sevoniva.memorica.security.UserDetailsImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DocumentService {

    private static final String DEFAULT_TITLE = "未命名文档";

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final DocumentUserStateRepository documentUserStateRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final WorkspaceService workspaceService;

    public DocumentService(DocumentRepository documentRepository,
                           DocumentVersionRepository documentVersionRepository,
                           DocumentUserStateRepository documentUserStateRepository,
                           UserRepository userRepository,
                           PermissionService permissionService,
                           AuditService auditService,
                           WorkspaceService workspaceService) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.documentUserStateRepository = documentUserStateRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.workspaceService = workspaceService;
    }

    public ApiResponse<Page<DocumentResponse>> listMyDocuments(int page, int size) {
        return listMyDocuments(page, size, null, null);
    }

    public ApiResponse<Page<DocumentResponse>> listMyDocuments(int page, int size, String query) {
        return listMyDocuments(page, size, query, null);
    }

    public ApiResponse<Page<DocumentResponse>> listMyDocuments(int page, int size, String query, String parentId) {
        Long userId = getCurrentUserId();
        PageRequest pr = PageRequest.of(safePage(page), safeSize(size), Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Document> docs = hasQuery(query)
                ? documentRepository.findByOwnerIdAndDeletedAtIsNullAndTitleContainingIgnoreCase(userId, query.trim(), pr)
                : hasParent(parentId)
                    ? documentRepository.findByOwnerIdAndDeletedAtIsNullAndParentId(userId, parentId.trim(), pr)
                    : documentRepository.findByOwnerIdAndDeletedAtIsNullAndParentIdIsNull(userId, pr);
        return ApiResponse.success(docs.map(this::toResponse));
    }

    public ApiResponse<Page<DocumentResponse>> listPublicDocuments(int page, int size) {
        return listPublicDocuments(page, size, null);
    }

    public ApiResponse<Page<DocumentResponse>> listPublicDocuments(int page, int size, String query) {
        PageRequest pr = PageRequest.of(safePage(page), safeSize(size), Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Document> docs = hasQuery(query)
                ? documentRepository.findByIsPublicTrueAndDeletedAtIsNullAndTitleContainingIgnoreCase(query.trim(), pr)
                : documentRepository.findByIsPublicTrueAndDeletedAtIsNull(pr);
        return ApiResponse.success(docs.map(this::toResponse));
    }

    public ApiResponse<Page<DocumentResponse>> listSharedDocuments(int page, int size, String query) {
        Long userId = getCurrentUserId();
        PageRequest pr = PageRequest.of(safePage(page), safeSize(size), Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Document> docs = hasQuery(query)
                ? documentRepository.findSharedWithUserByTitleContaining(
                    userId, DocumentPermission.ROLE_OWNER, query.trim(), pr)
                : documentRepository.findSharedWithUser(userId, DocumentPermission.ROLE_OWNER, pr);
        return ApiResponse.success(docs.map(this::toResponse));
    }

    public ApiResponse<Page<DocumentResponse>> listWorkspaceDocuments(String workspaceId, int page, int size) {
        return listWorkspaceDocuments(workspaceId, page, size, null, null);
    }

    public ApiResponse<Page<DocumentResponse>> listWorkspaceDocuments(String workspaceId, int page, int size, String query) {
        return listWorkspaceDocuments(workspaceId, page, size, query, null);
    }

    public ApiResponse<Page<DocumentResponse>> listWorkspaceDocuments(String workspaceId, int page, int size, String query, String parentId) {
        requireWorkspaceAccess(workspaceId);
        PageRequest pr = PageRequest.of(safePage(page), safeSize(size), Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Document> docs = hasQuery(query)
                ? documentRepository.findByWorkspaceIdAndDeletedAtIsNullAndTitleContainingIgnoreCase(workspaceId, query.trim(), pr)
                : hasParent(parentId)
                    ? documentRepository.findByWorkspaceIdAndDeletedAtIsNullAndParentId(workspaceId, parentId.trim(), pr)
                    : documentRepository.findByWorkspaceIdAndDeletedAtIsNullAndParentIdIsNull(workspaceId, pr);
        return ApiResponse.success(docs.map(this::toResponse));
    }

    public ApiResponse<List<DocumentResponse>> listWorkspaceFolders(String workspaceId) {
        requireWorkspaceAccess(workspaceId);
        return ApiResponse.success(documentRepository
                .findByWorkspaceIdAndDeletedAtIsNullAndItemTypeOrderByTitleAsc(workspaceId, Document.TYPE_FOLDER)
                .stream()
                .map(this::toResponse)
                .toList());
    }

    public ApiResponse<Page<DocumentResponse>> listFavoriteDocuments(int page, int size) {
        Long userId = getCurrentUserId();
        PageRequest pr = PageRequest.of(safePage(page), safeSize(size));
        return ApiResponse.success(listDocumentsFromStates(
                documentUserStateRepository.findByUserIdAndIsFavoriteTrueOrderByUpdatedAtDesc(userId, pr), pr));
    }

    public ApiResponse<Page<DocumentResponse>> listRecentDocuments(int page, int size) {
        Long userId = getCurrentUserId();
        PageRequest pr = PageRequest.of(safePage(page), safeSize(size));
        return ApiResponse.success(listDocumentsFromStates(
                documentUserStateRepository.findByUserIdAndLastOpenedAtIsNotNullOrderByLastOpenedAtDesc(userId, pr), pr));
    }

    public ApiResponse<Page<DocumentResponse>> listTrashDocuments(int page, int size) {
        Long userId = getCurrentUserId();
        PageRequest pr = PageRequest.of(safePage(page), safeSize(size), Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Document> docs = documentRepository.findByOwnerIdAndDeletedAtIsNotNull(userId, pr);
        return ApiResponse.success(docs.map(this::toResponse));
    }

    @Transactional
    public ApiResponse<DocumentResponse> createDocument(String title) {
        return createDocument(title, null, null);
    }

    @Transactional
    public ApiResponse<DocumentResponse> createDocument(String title, String workspaceId) {
        return createDocument(title, workspaceId, null);
    }

    @Transactional
    public ApiResponse<DocumentResponse> createDocument(String title, String workspaceId, String parentId) {
        User user = getCurrentUser();
        String targetWorkspaceId = resolveWorkspaceId(user, workspaceId);
        String targetParentId = resolveParentId(targetWorkspaceId, parentId);
        Document doc = Document.builder()
                .id(UUID.randomUUID().toString())
                .title(title != null && !title.isBlank() ? title : DEFAULT_TITLE)
                .owner(user)
                .ownerName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .workspaceId(targetWorkspaceId)
                .parentId(targetParentId)
                .itemType(Document.TYPE_DOCUMENT)
                .wordCount(0)
                .charCount(0)
                .isPublic(false)
                .build();
        documentRepository.save(doc);
        permissionService.grantOwner(doc, user);
        auditService.log(user.getId(), user.getUsername(), "DOCUMENT_CREATE",
                "DOCUMENT", doc.getId(), "Document created", null);
        return ApiResponse.success(toResponse(doc));
    }

    @Transactional
    public ApiResponse<DocumentResponse> createFolder(String title, String workspaceId, String parentId) {
        User user = getCurrentUser();
        String targetWorkspaceId = resolveWorkspaceId(user, workspaceId);
        String targetParentId = resolveParentId(targetWorkspaceId, parentId);
        Document folder = Document.builder()
                .id(UUID.randomUUID().toString())
                .title(title != null && !title.isBlank() ? title.trim() : "新建文件夹")
                .owner(user)
                .ownerName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .workspaceId(targetWorkspaceId)
                .parentId(targetParentId)
                .itemType(Document.TYPE_FOLDER)
                .wordCount(0)
                .charCount(0)
                .isPublic(false)
                .build();
        documentRepository.save(folder);
        permissionService.grantOwner(folder, user);
        auditService.log(user.getId(), user.getUsername(), "DOCUMENT_FOLDER_CREATE",
                "DOCUMENT", folder.getId(), "Folder created", null);
        return ApiResponse.success(toResponse(folder));
    }

    @Transactional
    public ApiResponse<DocumentResponse> getDocument(String id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkReadAccess(doc);
        markOpened(doc.getId());
        return ApiResponse.success(toResponse(doc));
    }

    @Transactional
    public ApiResponse<DocumentResponse> updateDocumentMeta(String id, String title, Boolean isPublic) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        boolean hasTitleUpdate = title != null && !title.isBlank();
        boolean hasVisibilityUpdate = isPublic != null;
        if (hasVisibilityUpdate) {
            checkManageAccess(doc);
        }
        if (hasTitleUpdate) {
            checkWriteAccess(doc);
            doc.setTitle(title);
        } else if (!hasVisibilityUpdate) {
            checkManageAccess(doc);
        }
        if (hasVisibilityUpdate) {
            doc.setIsPublic(isPublic);
        }
        documentRepository.save(doc);
        auditService.log(getCurrentUserId(), getCurrentUsername(), "DOCUMENT_UPDATE",
                "DOCUMENT", doc.getId(), "Document metadata updated", null);
        return ApiResponse.success(toResponse(doc));
    }

    @Transactional
    public ApiResponse<DocumentResponse> moveDocument(String id, String parentId) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkManageAccess(doc);
        if (doc.getDeletedAt() != null) {
            throw new AccessDeniedException("文档已删除");
        }
        String targetParentId = resolveParentId(doc.getWorkspaceId(), parentId);
        if (targetParentId != null && targetParentId.equals(doc.getId())) {
            throw new AccessDeniedException("不能移动到自身目录下");
        }
        if (Document.TYPE_FOLDER.equals(doc.getItemType()) && targetParentId != null
                && isDescendantOf(targetParentId, doc.getId())) {
            throw new AccessDeniedException("不能移动到自己的子目录下");
        }
        doc.setParentId(targetParentId);
        documentRepository.save(doc);
        auditService.log(getCurrentUserId(), getCurrentUsername(), "DOCUMENT_MOVE",
                "DOCUMENT", doc.getId(), "Document moved", null);
        return ApiResponse.success(toResponse(doc));
    }

    @Transactional
    public ApiResponse<Void> deleteDocument(String id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkManageAccess(doc);
        softDeleteTree(doc, LocalDateTime.now());
        auditService.log(getCurrentUserId(), getCurrentUsername(), "DOCUMENT_DELETE",
                "DOCUMENT", doc.getId(), "Document deleted", null);
        return ApiResponse.success(null);
    }

    @Transactional
    public ApiResponse<DocumentResponse> restoreDocument(String id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkManageAccess(doc);
        restoreTree(doc);
        auditService.log(getCurrentUserId(), getCurrentUsername(), "DOCUMENT_RESTORE",
                "DOCUMENT", doc.getId(), "Document restored", null);
        return ApiResponse.success(toResponse(doc));
    }

    @Transactional
    public ApiResponse<DocumentResponse> setFavorite(String id, boolean favorite) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkReadAccess(doc);
        documentUserStateRepository.upsertFavorite(id, getCurrentUserId(), favorite);
        auditService.log(getCurrentUserId(), getCurrentUsername(),
                favorite ? "DOCUMENT_FAVORITE" : "DOCUMENT_UNFAVORITE",
                "DOCUMENT", doc.getId(), favorite ? "Document favorited" : "Document unfavorited", null);
        return ApiResponse.success(toResponse(doc));
    }

    @Transactional
    public ApiResponse<?> saveVersion(String documentId, String contentJson, String snapshotHtml,
                                       Integer wordCount, Integer charCount) {
        return saveVersion(documentId, contentJson, snapshotHtml, wordCount, charCount, null);
    }

    @Transactional
    public ApiResponse<?> saveVersion(String documentId, String contentJson, String snapshotHtml,
                                       Integer wordCount, Integer charCount, String source) {
        User user = getCurrentUser();
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkWriteAccess(doc);

        var lastVersion = documentVersionRepository.findTopByDocumentIdOrderByVersionNumberDesc(documentId);
        if (lastVersion.isPresent() && lastVersion.get().getContentJson().equals(contentJson)) {
            doc.setWordCount(wordCount);
            doc.setCharCount(charCount);
            documentRepository.save(doc);
            return ApiResponse.success(Map.of(
                    "version", lastVersion.get().getVersionNumber(),
                    "saved", false,
                    "reason", "unchanged"
            ));
        }

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

        doc.setWordCount(wordCount);
        doc.setCharCount(charCount);
        documentRepository.save(doc);

        String saveSource = normalizeSaveSource(source);
        auditService.log(user.getId(), user.getUsername(), "DOCUMENT_VERSION_SAVE",
                "DOCUMENT", documentId, "Version " + nextVersion + " saved by " + saveSource, null);
        return ApiResponse.success(Map.of(
                "version", nextVersion,
                "saved", true,
                "source", saveSource
        ));
    }

    public ApiResponse<Page<DocumentVersionResponse>> listVersions(String documentId, int page, int size) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkReadAccess(doc);

        PageRequest pr = PageRequest.of(safePage(page), safeSize(size), Sort.by(Sort.Direction.DESC, "versionNumber"));
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
        Document doc = documentRepository.findById(v.getDocumentId())
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkReadAccess(doc);

        return ApiResponse.success(Map.of(
            "id", v.getId(),
            "versionNumber", v.getVersionNumber(),
            "contentJson", v.getContentJson(),
            "snapshotHtml", v.getSnapshotHtml(),
            "editorName", v.getEditorName(),
            "createdAt", v.getCreatedAt()
        ));
    }

    public ApiResponse<DocumentSharingResponse> getSharing(String documentId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkManageAccess(doc);
        return ApiResponse.success(toSharingResponse(doc));
    }

    @Transactional
    public ApiResponse<DocumentSharingResponse> grantAccess(String documentId, String username, String role) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkManageAccess(doc);
        if (!DocumentPermission.ROLE_VIEWER.equals(role) && !DocumentPermission.ROLE_EDITOR.equals(role)) {
            throw new AccessDeniedException("不支持的协作角色");
        }
        User target = userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));
        if (doc.getOwner().getId().equals(target.getId())) {
            throw new AccessDeniedException("所有者无需重复授权");
        }
        permissionService.grantAccess(documentId, target.getId(), role, getCurrentUserId());
        auditService.log(getCurrentUserId(), getCurrentUsername(), "DOCUMENT_SHARE_GRANT",
                "DOCUMENT", documentId, "Granted " + role + " to " + target.getUsername(), null);
        return ApiResponse.success(toSharingResponse(doc));
    }

    @Transactional
    public ApiResponse<DocumentSharingResponse> revokeAccess(String documentId, Long userId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkManageAccess(doc);
        if (doc.getOwner().getId().equals(userId)) {
            throw new AccessDeniedException("不能移除文档所有者");
        }
        permissionService.revokeAccess(documentId, userId);
        auditService.log(getCurrentUserId(), getCurrentUsername(), "DOCUMENT_SHARE_REVOKE",
                "DOCUMENT", documentId, "Revoked access for user " + userId, null);
        return ApiResponse.success(toSharingResponse(doc));
    }

    public ApiResponse<Page<DocumentAuditResponse>> listAuditLogs(String documentId, int page, int size) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        checkManageAccess(doc);
        PageRequest pr = PageRequest.of(safePage(page), safeSize(size));
        return ApiResponse.success(auditService.listForResource("DOCUMENT", documentId, pr)
                .map(log -> DocumentAuditResponse.builder()
                        .id(log.getId())
                        .username(log.getUsername())
                        .action(log.getAction())
                        .detail(log.getDetail())
                        .traceId(log.getTraceId())
                        .createdAt(log.getCreatedAt())
                        .build()));
    }

    private DocumentResponse toResponse(Document doc) {
        DocumentUserState state = findUserState(doc.getId(), getCurrentUserId()).orElse(null);
        return DocumentResponse.builder()
                .id(doc.getId())
                .title(doc.getTitle())
                .ownerName(doc.getOwnerName())
                .workspaceId(doc.getWorkspaceId())
                .parentId(doc.getParentId())
                .itemType(doc.getItemType())
                .wordCount(doc.getWordCount())
                .charCount(doc.getCharCount())
                .isPublic(doc.getIsPublic())
                .isFavorite(state != null && Boolean.TRUE.equals(state.getIsFavorite()))
                .canWrite(canCurrentUserWrite(doc))
                .canManage(canCurrentUserManage(doc))
                .coverImage(doc.getCoverImage())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .lastOpenedAt(state != null ? state.getLastOpenedAt() : null)
                .deletedAt(doc.getDeletedAt())
                .build();
    }

    private DocumentSharingResponse toSharingResponse(Document doc) {
        var members = permissionService.listPermissions(doc.getId()).stream()
                .map(permission -> {
                    User user = userRepository.findById(permission.getUserId()).orElse(null);
                    return DocumentSharingMemberResponse.builder()
                            .userId(permission.getUserId())
                            .username(user != null ? user.getUsername() : "")
                            .displayName(user != null ? user.getDisplayName() : "")
                            .email(user != null ? user.getEmail() : "")
                            .role(permission.getRole())
                            .grantedAt(permission.getCreatedAt())
                            .build();
                })
                .toList();
        return DocumentSharingResponse.builder()
                .documentId(doc.getId())
                .workspaceId(doc.getWorkspaceId())
                .workspaceName(workspaceService.workspaceName(doc.getWorkspaceId()))
                .isPublic(doc.getIsPublic())
                .members(members)
                .workspaceMembers(workspaceService.listMemberResponses(doc.getWorkspaceId()))
                .build();
    }

    private void checkManageAccess(Document doc) {
        Long currentUserId = getCurrentUserId();
        if (!doc.getOwner().getId().equals(currentUserId)
                && !workspaceService.canManage(doc.getWorkspaceId(), currentUserId)) {
            throw new AccessDeniedException("无权操作该文档");
        }
    }

    private void checkReadAccess(Document doc) {
        Long currentUserId = getCurrentUserId();
        if (doc.getDeletedAt() != null) {
            throw new AccessDeniedException("文档已删除");
        }
        if (!Boolean.TRUE.equals(doc.getIsPublic())
                && !doc.getOwner().getId().equals(currentUserId)
                && !workspaceService.canAccess(doc.getWorkspaceId(), currentUserId)
                && !permissionService.canRead(doc.getId(), currentUserId)) {
            throw new AccessDeniedException("无权访问该文档");
        }
    }

    private void checkWriteAccess(Document doc) {
        Long currentUserId = getCurrentUserId();
        if (doc.getDeletedAt() != null) {
            throw new AccessDeniedException("文档已删除");
        }
        if (!doc.getOwner().getId().equals(currentUserId)
                && !workspaceService.canManage(doc.getWorkspaceId(), currentUserId)
                && !permissionService.canWrite(doc.getId(), currentUserId)) {
            throw new AccessDeniedException("无权编辑该文档");
        }
    }

    private int safePage(int page) {
        return Math.max(page, 0);
    }

    private int safeSize(int size) {
        return Math.min(Math.max(size, 1), 100);
    }

    private boolean hasQuery(String query) {
        return query != null && !query.isBlank();
    }

    private boolean hasParent(String parentId) {
        return parentId != null && !parentId.isBlank();
    }

    private boolean canCurrentUserRead(Document doc) {
        try {
            checkReadAccess(doc);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    private boolean canCurrentUserWrite(Document doc) {
        try {
            checkWriteAccess(doc);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    private boolean canCurrentUserManage(Document doc) {
        try {
            checkManageAccess(doc);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    private String normalizeSaveSource(String source) {
        if ("auto".equals(source) || "restore".equals(source)) {
            return source;
        }
        return "manual";
    }

    private Long getCurrentUserId() {
        UserDetailsImpl details = (UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return details.getId();
    }

    private String getCurrentUsername() {
        UserDetailsImpl details = (UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return details.getUsername();
    }

    private User getCurrentUser() {
        return userRepository.findById(getCurrentUserId()).orElseThrow();
    }

    private void markOpened(String documentId) {
        documentUserStateRepository.upsertLastOpened(documentId, getCurrentUserId());
    }

    private java.util.Optional<DocumentUserState> findUserState(String documentId, Long userId) {
        var state = documentUserStateRepository.findByDocumentIdAndUserId(documentId, userId);
        return state != null ? state : java.util.Optional.empty();
    }

    private Page<DocumentResponse> listDocumentsFromStates(Page<DocumentUserState> states, PageRequest pr) {
        List<DocumentResponse> docs = states.getContent().stream()
                .map(state -> documentRepository.findById(state.getDocumentId()).orElse(null))
                .filter(doc -> doc != null && doc.getDeletedAt() == null)
                .filter(this::canCurrentUserRead)
                .map(this::toResponse)
                .toList();
        return new PageImpl<>(docs, pr, docs.size());
    }

    private String resolveWorkspaceId(User user, String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            return workspaceService.defaultWorkspaceId(user);
        }
        if (!workspaceService.canAccess(workspaceId, user.getId())) {
            throw new AccessDeniedException("无权在该空间创建文档");
        }
        return workspaceId;
    }

    private String resolveParentId(String workspaceId, String parentId) {
        if (!hasParent(parentId)) {
            return null;
        }
        Document parent = documentRepository.findById(parentId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("父级文件夹不存在"));
        checkReadAccess(parent);
        if (!Document.TYPE_FOLDER.equals(parent.getItemType())
                || !workspaceId.equals(parent.getWorkspaceId())
                || parent.getDeletedAt() != null) {
            throw new AccessDeniedException("无权使用该父级文件夹");
        }
        return parent.getId();
    }

    private void softDeleteTree(Document doc, LocalDateTime deletedAt) {
        doc.setDeletedAt(deletedAt);
        documentRepository.save(doc);
        if (Document.TYPE_FOLDER.equals(doc.getItemType())) {
            documentRepository.findByParentIdAndDeletedAtIsNull(doc.getId())
                    .forEach(child -> softDeleteTree(child, deletedAt));
        }
    }

    private void restoreTree(Document doc) {
        doc.setDeletedAt(null);
        documentRepository.save(doc);
        if (Document.TYPE_FOLDER.equals(doc.getItemType())) {
            documentRepository.findByParentId(doc.getId())
                    .forEach(this::restoreTree);
        }
    }

    private boolean isDescendantOf(String candidateId, String ancestorId) {
        String currentId = candidateId;
        while (hasParent(currentId)) {
            if (ancestorId.equals(currentId)) {
                return true;
            }
            Document current = documentRepository.findById(currentId).orElse(null);
            if (current == null) {
                return false;
            }
            currentId = current.getParentId();
        }
        return false;
    }

    private void requireWorkspaceAccess(String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()
                || !workspaceService.canAccess(workspaceId, getCurrentUserId())) {
            throw new AccessDeniedException("无权访问该空间");
        }
    }
}
