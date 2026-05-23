package sevoniva.memorica.controller;

import sevoniva.memorica.dto.ApiResponse;
import sevoniva.memorica.service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private FileService fileService;

    @PostMapping("/upload")
    public ApiResponse<?> upload(@RequestParam("file") MultipartFile file) {
        try {
            String objectName = fileService.uploadFile(file);
            String url = fileService.getFileUrl(objectName);
            return ApiResponse.success(Map.of("objectName", objectName, "url", url));
        } catch (Exception e) {
            return ApiResponse.error("上传失败: " + e.getMessage());
        }
    }

    @GetMapping("/view/{objectName}")
    public ApiResponse<?> getUrl(@PathVariable String objectName) {
        try {
            String url = fileService.getFileUrl(objectName);
            return ApiResponse.success(Map.of("url", url));
        } catch (Exception e) {
            return ApiResponse.error("获取链接失败: " + e.getMessage());
        }
    }
}
