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
    public ApiResponse<?> upload(@RequestParam("file") MultipartFile file) throws Exception {
        Long userId = currentUserId();
        String objectName = fileService.uploadFile(file, userId);
        String url = fileService.getFileUrl(objectName, userId);
        return ApiResponse.success(Map.of("objectName", objectName, "url", url));
    }

    @GetMapping("/view/{objectName}")
    public ApiResponse<?> getUrl(@PathVariable String objectName) throws Exception {
        String url = fileService.getFileUrl(objectName, currentUserId());
        return ApiResponse.success(Map.of("url", url));
    }

    private Long currentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ((UserDetailsImpl) principal).getId();
    }
}
