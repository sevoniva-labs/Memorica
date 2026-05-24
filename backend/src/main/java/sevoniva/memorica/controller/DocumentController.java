package sevoniva.memorica.controller;

import sevoniva.memorica.dto.*;
import sevoniva.memorica.service.DocumentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/my")
    public ApiResponse<Page<DocumentResponse>> listMy(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String parentId) {
        return documentService.listMyDocuments(page, size, q, parentId);
    }

    @GetMapping("/public")
    public ApiResponse<Page<DocumentResponse>> listPublic(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q) {
        return documentService.listPublicDocuments(page, size, q);
    }

    @GetMapping("/workspace/{workspaceId}")
    public ApiResponse<Page<DocumentResponse>> listWorkspace(
            @PathVariable String workspaceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String parentId) {
        return documentService.listWorkspaceDocuments(workspaceId, page, size, q, parentId);
    }

    @GetMapping("/workspace/{workspaceId}/folders")
    public ApiResponse<java.util.List<DocumentResponse>> listWorkspaceFolders(@PathVariable String workspaceId) {
        return documentService.listWorkspaceFolders(workspaceId);
    }

    @GetMapping("/recent")
    public ApiResponse<Page<DocumentResponse>> listRecent(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return documentService.listRecentDocuments(page, size);
    }

    @GetMapping("/favorites")
    public ApiResponse<Page<DocumentResponse>> listFavorites(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return documentService.listFavoriteDocuments(page, size);
    }

    @GetMapping("/trash")
    public ApiResponse<Page<DocumentResponse>> listTrash(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return documentService.listTrashDocuments(page, size);
    }

    @GetMapping("/{id}")
    public ApiResponse<DocumentResponse> get(@PathVariable String id) {
        return documentService.getDocument(id);
    }

    @PostMapping
    public ApiResponse<DocumentResponse> create(@Valid @RequestBody CreateDocumentRequest body) {
        return documentService.createDocument(body.getTitle(), body.getWorkspaceId(), body.getParentId());
    }

    @PostMapping("/folders")
    public ApiResponse<DocumentResponse> createFolder(@Valid @RequestBody CreateFolderRequest body) {
        return documentService.createFolder(body.getTitle(), body.getWorkspaceId(), body.getParentId());
    }

    @PutMapping("/{id}")
    public ApiResponse<DocumentResponse> update(@PathVariable String id,
                                                 @Valid @RequestBody UpdateDocumentRequest body) {
        return documentService.updateDocumentMeta(id, body.getTitle(), body.getIsPublic());
    }

    @PutMapping("/{id}/move")
    public ApiResponse<DocumentResponse> move(@PathVariable String id,
                                              @Valid @RequestBody MoveDocumentRequest body) {
        return documentService.moveDocument(id, body.getParentId());
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        return documentService.deleteDocument(id);
    }

    @PostMapping("/{id}/restore")
    public ApiResponse<DocumentResponse> restore(@PathVariable String id) {
        return documentService.restoreDocument(id);
    }

    @PutMapping("/{id}/favorite")
    public ApiResponse<DocumentResponse> favorite(@PathVariable String id,
                                                  @RequestParam(defaultValue = "true") boolean favorite) {
        return documentService.setFavorite(id, favorite);
    }

    @PostMapping("/{id}/versions")
    public ApiResponse<?> saveVersion(@PathVariable String id,
                                       @Valid @RequestBody SaveVersionRequest body) {
        return documentService.saveVersion(id, body.getContentJson(), body.getSnapshotHtml(),
                body.getWordCount(), body.getCharCount(), body.getSource());
    }

    @GetMapping("/{id}/versions")
    public ApiResponse<Page<DocumentVersionResponse>> listVersions(
            @PathVariable String id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return documentService.listVersions(id, page, size);
    }

    @GetMapping("/versions/{versionId}")
    public ApiResponse<?> getVersion(@PathVariable Long versionId) {
        return documentService.getVersion(versionId);
    }

    @GetMapping("/{id}/sharing")
    public ApiResponse<DocumentSharingResponse> getSharing(@PathVariable String id) {
        return documentService.getSharing(id);
    }

    @PostMapping("/{id}/sharing/members")
    public ApiResponse<DocumentSharingResponse> grantAccess(@PathVariable String id,
                                                            @Valid @RequestBody GrantDocumentAccessRequest body) {
        return documentService.grantAccess(id, body.getUsername(), body.getRole());
    }

    @DeleteMapping("/{id}/sharing/members/{userId}")
    public ApiResponse<DocumentSharingResponse> revokeAccess(@PathVariable String id,
                                                             @PathVariable Long userId) {
        return documentService.revokeAccess(id, userId);
    }

    @GetMapping("/{id}/audit")
    public ApiResponse<Page<DocumentAuditResponse>> listAudit(
            @PathVariable String id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return documentService.listAuditLogs(id, page, size);
    }
}
