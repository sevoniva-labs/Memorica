package sevoniva.memorica.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.minio.*;
import io.minio.http.Method;
import sevoniva.memorica.entity.Document;
import sevoniva.memorica.entity.UploadedFile;
import sevoniva.memorica.exception.AccessDeniedException;
import sevoniva.memorica.exception.ResourceNotFoundException;
import sevoniva.memorica.repository.DocumentRepository;
import sevoniva.memorica.repository.UploadedFileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class FileService {

    private static final Logger log = LoggerFactory.getLogger(FileService.class);
    private static final int MIN_PRESIGNED_URL_EXPIRY_MINUTES = 1;
    private static final int MAX_PRESIGNED_URL_EXPIRY_MINUTES = 60;

    private final MinioClient minioClient;
    private final UploadedFileRepository uploadedFileRepository;
    private final DocumentRepository documentRepository;
    private final PermissionService permissionService;
    private final WorkspaceService workspaceService;

    @Value("${app.minio.bucket-name}")
    private String bucketName;

    @Value("${app.file.max-size}")
    private long maxFileSize;

    @Value("${app.file.allowed-types}")
    private String allowedTypes;

    @Value("${app.file.url-expiry-minutes}")
    private int urlExpiryMinutes;

    @Value("${app.file.orphan-retention-days:7}")
    private int orphanRetentionDays;

    public FileService(MinioClient minioClient,
                       UploadedFileRepository uploadedFileRepository,
                       DocumentRepository documentRepository,
                       PermissionService permissionService,
                       WorkspaceService workspaceService) {
        this.minioClient = minioClient;
        this.uploadedFileRepository = uploadedFileRepository;
        this.documentRepository = documentRepository;
        this.permissionService = permissionService;
        this.workspaceService = workspaceService;
    }

    @CircuitBreaker(name = "minioUpload", fallbackMethod = "uploadFileFallback")
    @Retry(name = "minioRetry")
    public String uploadFile(MultipartFile file, Long uploaderId) throws Exception {
        return uploadFile(file, uploaderId, null);
    }

    @CircuitBreaker(name = "minioUpload", fallbackMethod = "uploadFileFallback")
    @Retry(name = "minioRetry")
    public String uploadFile(MultipartFile file, Long uploaderId, String documentId) throws Exception {
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

        String targetDocumentId = normalizeDocumentId(documentId);
        if (targetDocumentId != null) {
            requireDocumentWriteAccess(targetDocumentId, uploaderId);
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
                .documentId(targetDocumentId)
                .build());
        return objectName;
    }

    public String uploadFileFallback(MultipartFile file, Long uploaderId, Throwable t) throws Exception {
        log.error("MinIO upload failed (circuit open or retries exhausted): {}", t.getMessage());
        throw new RuntimeException("文件上传服务暂时不可用，请稍后重试");
    }

    public String uploadFileFallback(MultipartFile file, Long uploaderId, String documentId, Throwable t) throws Exception {
        log.error("MinIO upload failed (circuit open or retries exhausted): {}", t.getMessage());
        throw new RuntimeException("文件上传服务暂时不可用，请稍后重试");
    }

    @CircuitBreaker(name = "minioGetUrl")
    public String getFileUrl(String objectName, Long requesterId) throws Exception {
        UploadedFile file = uploadedFileRepository.findByObjectName(objectName)
                .orElseThrow(() -> new ResourceNotFoundException("文件不存在"));
        if (!file.getUploaderId().equals(requesterId) && !canReadLinkedDocument(file, requesterId)) {
            throw new AccessDeniedException("无权访问该文件");
        }
        return minioClient.getPresignedObjectUrl(
            GetPresignedObjectUrlArgs.builder()
                .bucket(bucketName)
                .object(objectName)
                .method(Method.GET)
                .expiry(safeUrlExpiryMinutes(), TimeUnit.MINUTES)
                .build()
        );
    }

    public UploadedFile getFile(String objectName, Long requesterId) {
        UploadedFile file = uploadedFileRepository.findByObjectName(objectName)
                .orElseThrow(() -> new ResourceNotFoundException("文件不存在"));
        if (!file.getUploaderId().equals(requesterId) && !canReadLinkedDocument(file, requesterId)) {
            throw new AccessDeniedException("无权访问该文件");
        }
        return file;
    }

    public int cleanupOrphanFiles(LocalDateTime createdBefore) {
        List<UploadedFile> files = uploadedFileRepository.findTop100ByDocumentIdIsNullAndCreatedAtBefore(createdBefore);
        int deleted = 0;
        for (UploadedFile file : files) {
            try {
                minioClient.removeObject(RemoveObjectArgs.builder()
                        .bucket(bucketName)
                        .object(file.getObjectName())
                        .build());
                uploadedFileRepository.delete(file);
                deleted++;
            } catch (Exception e) {
                log.warn("Failed to cleanup orphan uploaded file {}: {}", file.getObjectName(), e.getMessage());
            }
        }
        return deleted;
    }

    /**
     * Remove uploaded objects no longer linked to a document.
     * Deleted documents set uploaded_files.document_id to NULL via FK, so this keeps object storage bounded.
     */
    @Scheduled(cron = "0 45 3 * * ?")
    public void cleanupOrphanUploadedFiles() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(Math.max(orphanRetentionDays, 1));
        int deleted = cleanupOrphanFiles(cutoff);
        if (deleted > 0) {
            log.info("Cleaned up {} orphan uploaded files", deleted);
        }
    }

    private void ensureBucketExists() throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
        }
    }

    private String normalizeDocumentId(String documentId) {
        return documentId != null && !documentId.isBlank() ? documentId.trim() : null;
    }

    private int safeUrlExpiryMinutes() {
        return Math.min(
                Math.max(urlExpiryMinutes, MIN_PRESIGNED_URL_EXPIRY_MINUTES),
                MAX_PRESIGNED_URL_EXPIRY_MINUTES);
    }

    private void requireDocumentWriteAccess(String documentId, Long userId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        if (doc.getDeletedAt() != null
                || (!doc.getOwner().getId().equals(userId)
                && !workspaceService.canManage(doc.getWorkspaceId(), userId)
                && !permissionService.canWrite(doc.getId(), userId))) {
            throw new AccessDeniedException("无权向该文档上传文件");
        }
    }

    private boolean canReadLinkedDocument(UploadedFile file, Long userId) {
        String documentId = normalizeDocumentId(file.getDocumentId());
        if (documentId == null) {
            return false;
        }
        return documentRepository.findById(documentId)
                .filter(doc -> doc.getDeletedAt() == null)
                .map(doc -> Boolean.TRUE.equals(doc.getIsPublic())
                        || doc.getOwner().getId().equals(userId)
                        || workspaceService.canAccess(doc.getWorkspaceId(), userId)
                        || permissionService.canRead(doc.getId(), userId))
                .orElse(false);
    }
}
