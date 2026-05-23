package sevoniva.memorica.controller;

import sevoniva.memorica.dto.*;
import sevoniva.memorica.service.DocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    @Autowired
    private DocumentService documentService;

    @GetMapping("/my")
    public ApiResponse<List<DocumentResponse>> listMy() {
        return documentService.listMyDocuments();
    }

    @GetMapping("/public")
    public ApiResponse<List<DocumentResponse>> listPublic() {
        return documentService.listPublicDocuments();
    }

    @GetMapping("/{id}")
    public ApiResponse<DocumentResponse> get(@PathVariable String id) {
        return documentService.getDocument(id);
    }

    @PostMapping
    public ApiResponse<DocumentResponse> create(@RequestBody Map<String, String> body) {
        return documentService.createDocument(body.get("title"));
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String title = body.containsKey("title") ? (String) body.get("title") : null;
        Boolean isPublic = body.containsKey("isPublic") ? (Boolean) body.get("isPublic") : null;
        return documentService.updateDocumentMeta(id, title, isPublic);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<?> delete(@PathVariable String id) {
        return documentService.deleteDocument(id);
    }

    @PostMapping("/{id}/versions")
    public ApiResponse<?> saveVersion(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String contentJson = (String) body.get("contentJson");
        String snapshotHtml = (String) body.get("snapshotHtml");
        Integer wordCount = body.get("wordCount") != null ? ((Number) body.get("wordCount")).intValue() : 0;
        Integer charCount = body.get("charCount") != null ? ((Number) body.get("charCount")).intValue() : 0;
        return documentService.saveVersion(id, contentJson, snapshotHtml, wordCount, charCount);
    }

    @GetMapping("/{id}/versions")
    public ApiResponse<?> listVersions(@PathVariable String id) {
        return documentService.listVersions(id);
    }

    @GetMapping("/versions/{versionId}")
    public ApiResponse<?> getVersion(@PathVariable Long versionId) {
        return documentService.getVersion(versionId);
    }
}
