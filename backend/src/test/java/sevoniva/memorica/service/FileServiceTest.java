package sevoniva.memorica.service;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
    void getFile_shouldDenyDeletedLinkedDocumentForOtherUsers() {
        UploadedFile file = UploadedFile.builder()
                .objectName("file-1.pdf")
                .contentType("application/pdf")
                .sizeBytes(12L)
                .uploaderId(1L)
                .documentId("doc-1")
                .build();
        Document doc = Document.builder()
                .id("doc-1")
                .title("Deleted")
                .owner(User.builder().id(1L).username("owner").build())
                .ownerName("owner")
                .workspaceId("team-1")
                .isPublic(true)
                .deletedAt(LocalDateTime.now())
                .build();
        when(uploadedFileRepository.findByObjectName("file-1.pdf")).thenReturn(Optional.of(file));
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));

        assertThrows(AccessDeniedException.class, () -> fileService.getFile("file-1.pdf", 2L));
    }

    @Test
    void getFileUrl_shouldDenyLinkedPrivateDocumentForNonReaderWithoutPresigning() throws Exception {
        UploadedFile file = UploadedFile.builder()
                .objectName("file-1.pdf")
                .contentType("application/pdf")
                .sizeBytes(12L)
                .uploaderId(1L)
                .documentId("doc-1")
                .build();
        Document doc = Document.builder()
                .id("doc-1")
                .title("Private")
                .owner(User.builder().id(1L).username("owner").build())
                .ownerName("owner")
                .workspaceId("team-1")
                .isPublic(false)
                .build();
        when(uploadedFileRepository.findByObjectName("file-1.pdf")).thenReturn(Optional.of(file));
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(workspaceService.canAccess("team-1", 2L)).thenReturn(false);
        when(permissionService.canRead("doc-1", 2L)).thenReturn(false);

        assertThrows(AccessDeniedException.class, () -> fileService.getFileUrl("file-1.pdf", 2L));
        verify(minioClient, never()).getPresignedObjectUrl(any(GetPresignedObjectUrlArgs.class));
    }

    @Test
    void getFileUrl_shouldAllowPublicLinkedDocumentForOtherUsers() throws Exception {
        UploadedFile file = UploadedFile.builder()
                .objectName("file-1.pdf")
                .contentType("application/pdf")
                .sizeBytes(12L)
                .uploaderId(1L)
                .documentId("doc-1")
                .build();
        Document doc = Document.builder()
                .id("doc-1")
                .title("Public")
                .owner(User.builder().id(1L).username("owner").build())
                .ownerName("owner")
                .workspaceId("team-1")
                .isPublic(true)
                .build();
        ReflectionTestUtils.setField(fileService, "urlExpiryMinutes", 10);
        when(uploadedFileRepository.findByObjectName("file-1.pdf")).thenReturn(Optional.of(file));
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(minioClient.getPresignedObjectUrl(any(GetPresignedObjectUrlArgs.class)))
                .thenReturn("https://files.local/file-1.pdf");

        String url = fileService.getFileUrl("file-1.pdf", 2L);

        assertEquals("https://files.local/file-1.pdf", url);
    }

    @Test
    void getFileUrl_shouldCapPresignedUrlExpiryAtOneHour() throws Exception {
        UploadedFile file = UploadedFile.builder()
                .objectName("file-1.pdf")
                .contentType("application/pdf")
                .sizeBytes(12L)
                .uploaderId(1L)
                .build();
        ReflectionTestUtils.setField(fileService, "urlExpiryMinutes", 180);
        when(uploadedFileRepository.findByObjectName("file-1.pdf")).thenReturn(Optional.of(file));
        when(minioClient.getPresignedObjectUrl(any(GetPresignedObjectUrlArgs.class)))
                .thenReturn("https://files.local/file-1.pdf");

        String url = fileService.getFileUrl("file-1.pdf", 1L);

        ArgumentCaptor<GetPresignedObjectUrlArgs> args = ArgumentCaptor.forClass(GetPresignedObjectUrlArgs.class);
        verify(minioClient).getPresignedObjectUrl(args.capture());
        assertEquals("https://files.local/file-1.pdf", url);
        assertEquals(60 * 60, args.getValue().expiry());
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
