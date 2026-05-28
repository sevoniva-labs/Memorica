package sevoniva.memorica.controller;

import sevoniva.memorica.dto.ApiResponse;
import sevoniva.memorica.security.UserDetailsImpl;
import sevoniva.memorica.service.FileService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    @PostMapping("/upload")
    public ApiResponse<?> upload(@RequestParam("file") MultipartFile file,
                                 @RequestParam(value = "documentId", required = false) String documentId) throws Exception {
        Long userId = currentUserId();
        String objectName = fileService.uploadFile(file, userId, documentId);
        String url = fileService.getFileUrl(objectName, userId);
        var uploaded = fileService.getFile(objectName, userId);
        return ApiResponse.success(Map.of(
                "objectName", objectName,
                "url", url,
                "originalName", uploaded.getOriginalName() != null ? uploaded.getOriginalName() : objectName,
                "contentType", uploaded.getContentType(),
                "sizeBytes", uploaded.getSizeBytes(),
                "documentId", uploaded.getDocumentId() != null ? uploaded.getDocumentId() : ""
        ));
    }

    @GetMapping("/view/{objectName}")
    public ApiResponse<?> getUrl(@PathVariable String objectName) throws Exception {
        Long userId = currentUserId();
        String url = fileService.getFileUrl(objectName, userId);
        var file = fileService.getFile(objectName, userId);
        return ApiResponse.success(Map.of(
                "objectName", file.getObjectName(),
                "url", url,
                "originalName", file.getOriginalName() != null ? file.getOriginalName() : file.getObjectName(),
                "contentType", file.getContentType(),
                "sizeBytes", file.getSizeBytes(),
                "documentId", file.getDocumentId() != null ? file.getDocumentId() : ""
        ));
    }

    private Long currentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ((UserDetailsImpl) principal).getId();
    }
}
