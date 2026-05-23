package sevoniva.memorica.controller;

import sevoniva.memorica.dto.ApiResponse;
import sevoniva.memorica.service.FileService;
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
    public ApiResponse<?> upload(@RequestParam("file") MultipartFile file) {
        try {
            String objectName = fileService.uploadFile(file);
            String url = fileService.getFileUrl(objectName);
            return ApiResponse.success(Map.of("objectName", objectName, "url", url));
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("上传失败: " + e.getMessage());
        }
    }

    @GetMapping("/view/{objectName}")
    public ApiResponse<?> getUrl(@PathVariable String objectName) {
        try {
            String url = fileService.getFileUrl(objectName);
            return ApiResponse.success(Map.of("url", url));
        } catch (Exception e) {
            throw new RuntimeException("获取链接失败: " + e.getMessage());
        }
    }
}
