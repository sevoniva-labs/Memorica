package sevoniva.memorica.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.minio.*;
import io.minio.http.Method;
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

    @Value("${app.minio.bucket-name}")
    private String bucketName;

    @Value("${app.file.max-size}")
    private long maxFileSize;

    @Value("${app.file.allowed-types}")
    private String allowedTypes;

    public FileService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    @CircuitBreaker(name = "minioUpload", fallbackMethod = "uploadFileFallback")
    @Retry(name = "minioRetry")
    public String uploadFile(MultipartFile file) throws Exception {
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
        return objectName;
    }

    public String uploadFileFallback(MultipartFile file, Throwable t) throws Exception {
        log.error("MinIO upload failed (circuit open or retries exhausted): {}", t.getMessage());
        throw new RuntimeException("文件上传服务暂时不可用，请稍后重试");
    }

    @CircuitBreaker(name = "minioGetUrl")
    public String getFileUrl(String objectName) throws Exception {
        return minioClient.getPresignedObjectUrl(
            GetPresignedObjectUrlArgs.builder()
                .bucket(bucketName)
                .object(objectName)
                .method(Method.GET)
                .expiry(7, TimeUnit.DAYS)
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
