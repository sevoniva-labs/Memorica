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
            @RequestParam(defaultValue = "20") int size) {
        return documentService.listMyDocuments(page, size);
    }

    @GetMapping("/public")
    public ApiResponse<Page<DocumentResponse>> listPublic(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return documentService.listPublicDocuments(page, size);
    }

    @GetMapping("/{id}")
    public ApiResponse<DocumentResponse> get(@PathVariable String id) {
        return documentService.getDocument(id);
    }

    @PostMapping
    public ApiResponse<DocumentResponse> create(@Valid @RequestBody CreateDocumentRequest body) {
        return documentService.createDocument(body.getTitle());
    }

    @PutMapping("/{id}")
    public ApiResponse<DocumentResponse> update(@PathVariable String id,
                                                 @Valid @RequestBody UpdateDocumentRequest body) {
        return documentService.updateDocumentMeta(id, body.getTitle(), body.getIsPublic());
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        return documentService.deleteDocument(id);
    }

    @PostMapping("/{id}/versions")
    public ApiResponse<?> saveVersion(@PathVariable String id,
                                       @Valid @RequestBody SaveVersionRequest body) {
        return documentService.saveVersion(id, body.getContentJson(), body.getSnapshotHtml(),
                body.getWordCount(), body.getCharCount());
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
}
