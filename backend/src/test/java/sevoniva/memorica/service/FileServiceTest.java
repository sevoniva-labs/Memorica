package sevoniva.memorica.service;

import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import sevoniva.memorica.entity.Document;
import sevoniva.memorica.entity.UploadedFile;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.exception.AccessDeniedException;
import sevoniva.memorica.repository.DocumentRepository;
import sevoniva.memorica.repository.UploadedFileRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @Mock
    private MinioClient minioClient;
    @Mock
    private UploadedFileRepository uploadedFileRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private PermissionService permissionService;
    @Mock
    private WorkspaceService workspaceService;

    private FileService fileService;

    @BeforeEach
    void setUp() {
        fileService = new FileService(minioClient, uploadedFileRepository,
                documentRepository, permissionService, workspaceService);
        ReflectionTestUtils.setField(fileService, "bucketName", "memorica");
    }

    @Test
    void getFile_shouldAllowLinkedDocumentViewer() {
        UploadedFile file = UploadedFile.builder()
                .objectName("file-1.pdf")
                .contentType("application/pdf")
                .sizeBytes(12L)
                .uploaderId(1L)
                .documentId("doc-1")
                .build();
        Document doc = Document.builder()
                .id("doc-1")
                .title("Shared")
                .owner(User.builder().id(1L).username("owner").build())
                .ownerName("owner")
                .isPublic(false)
                .build();
        when(uploadedFileRepository.findByObjectName("file-1.pdf")).thenReturn(Optional.of(file));
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(permissionService.canRead("doc-1", 2L)).thenReturn(true);

        UploadedFile result = fileService.getFile("file-1.pdf", 2L);

        assertEquals("file-1.pdf", result.getObjectName());
    }

    @Test
    void getFile_shouldDenyUnlinkedFileForOtherUsers() {
        UploadedFile file = UploadedFile.builder()
                .objectName("file-1.pdf")
                .contentType("application/pdf")
                .sizeBytes(12L)
                .uploaderId(1L)
                .build();
        when(uploadedFileRepository.findByObjectName("file-1.pdf")).thenReturn(Optional.of(file));

        assertThrows(AccessDeniedException.class, () -> fileService.getFile("file-1.pdf", 2L));
    }

    @Test
    void cleanupOrphanFiles_shouldRemoveObjectAndMetadata() throws Exception {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        UploadedFile file = UploadedFile.builder()
                .objectName("orphan.pdf")
                .contentType("application/pdf")
                .sizeBytes(12L)
                .uploaderId(1L)
                .build();
        when(uploadedFileRepository.findTop100ByDocumentIdIsNullAndCreatedAtBefore(cutoff)).thenReturn(List.of(file));

        int deleted = fileService.cleanupOrphanFiles(cutoff);

        assertEquals(1, deleted);
        verify(minioClient).removeObject(any(RemoveObjectArgs.class));
        verify(uploadedFileRepository).delete(file);
    }

    @Test
    void cleanupOrphanFiles_shouldKeepMetadataWhenObjectDeleteFails() throws Exception {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        UploadedFile file = UploadedFile.builder()
                .objectName("orphan.pdf")
                .contentType("application/pdf")
                .sizeBytes(12L)
                .uploaderId(1L)
                .build();
        when(uploadedFileRepository.findTop100ByDocumentIdIsNullAndCreatedAtBefore(cutoff)).thenReturn(List.of(file));
        doThrow(new RuntimeException("minio down")).when(minioClient).removeObject(any(RemoveObjectArgs.class));

        int deleted = fileService.cleanupOrphanFiles(cutoff);

        assertEquals(0, deleted);
        verify(uploadedFileRepository, never()).delete(any(UploadedFile.class));
    }
}
