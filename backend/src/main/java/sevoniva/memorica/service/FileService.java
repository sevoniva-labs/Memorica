package sevoniva.memorica.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.minio.*;
import io.minio.http.Method;
import sevoniva.memorica.entity.UploadedFile;
import sevoniva.memorica.exception.AccessDeniedException;
import sevoniva.memorica.exception.ResourceNotFoundException;
import sevoniva.memorica.repository.UploadedFileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class FileService {

    private static final Logger log = LoggerFactory.getLogger(FileService.class);

    private final MinioClient minioClient;
    private final UploadedFileRepository uploadedFileRepository;

    @Value("${app.minio.bucket-name}")
    private String bucketName;

    @Value("${app.file.max-size}")
    private long maxFileSize;

    @Value("${app.file.allowed-types}")
    private String allowedTypes;

    @Value("${app.file.url-expiry-minutes}")
    private int urlExpiryMinutes;

    public FileService(MinioClient minioClient, UploadedFileRepository uploadedFileRepository) {
        this.minioClient = minioClient;
        this.uploadedFileRepository = uploadedFileRepository;
    }

    @CircuitBreaker(name = "minioUpload", fallbackMethod = "uploadFileFallback")
    @Retry(name = "minioRetry")
    public String uploadFile(MultipartFile file, Long uploaderId) throws Exception {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }
        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException("文件大小超过限制 (" + (maxFileSize / 1024 / 1024) + "MB)");
        }

        String contentType = file.getContentType();
        Set<String> allowed = Set.of(allowedTypes.split(","));
        if (contentType == null || !allowed.contains(contentType)) {
            throw new IllegalArgumentException("不支持的文件类型: " + contentType);
        }

        ensureBucketExists();

        String extension = "";
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
        }
        String objectName = UUID.randomUUID().toString() + extension;

        minioClient.putObject(
            PutObjectArgs.builder()
                .bucket(bucketName)
                .object(objectName)
                .stream(file.getInputStream(), file.getSize(), -1)
                .contentType(contentType)
                .build()
        );
        uploadedFileRepository.save(UploadedFile.builder()
                .objectName(objectName)
                .originalName(originalName)
                .contentType(contentType)
                .sizeBytes(file.getSize())
                .uploaderId(uploaderId)
                .build());
        return objectName;
    }

    public String uploadFileFallback(MultipartFile file, Long uploaderId, Throwable t) throws Exception {
        log.error("MinIO upload failed (circuit open or retries exhausted): {}", t.getMessage());
        throw new RuntimeException("文件上传服务暂时不可用，请稍后重试");
    }

    @CircuitBreaker(name = "minioGetUrl")
    public String getFileUrl(String objectName, Long requesterId) throws Exception {
        UploadedFile file = uploadedFileRepository.findByObjectName(objectName)
                .orElseThrow(() -> new ResourceNotFoundException("文件不存在"));
        if (!file.getUploaderId().equals(requesterId)) {
            throw new AccessDeniedException("无权访问该文件");
        }
        return minioClient.getPresignedObjectUrl(
            GetPresignedObjectUrlArgs.builder()
                .bucket(bucketName)
                .object(objectName)
                .method(Method.GET)
                .expiry(Math.max(urlExpiryMinutes, 1), TimeUnit.MINUTES)
                .build()
        );
    }

    private void ensureBucketExists() throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
        }
    }
}
