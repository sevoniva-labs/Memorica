package sevoniva.memorica.service;

import sevoniva.memorica.entity.Document;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.exception.AccessDeniedException;
import sevoniva.memorica.exception.ResourceNotFoundException;
import sevoniva.memorica.repository.DocumentRepository;
import sevoniva.memorica.repository.DocumentVersionRepository;
import sevoniva.memorica.repository.UserRepository;
import sevoniva.memorica.security.UserDetailsImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private DocumentVersionRepository documentVersionRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PermissionService permissionService;

    private DocumentService documentService;
    private User mockUser;

    @BeforeEach
    void setUp() {
        documentService = new DocumentService(documentRepository,
                documentVersionRepository, userRepository, permissionService);
        mockUser = User.builder()
                .id(1L).username("test").displayName("Test User")
                .email("t@t.com").color("#ef4444")
                .build();
        UserDetailsImpl userDetails = UserDetailsImpl.build(mockUser);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createDocument_shouldSucceed() {
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        var result = documentService.createDocument("Test Doc");
        assertNotNull(result.getData());
        assertEquals("Test Doc", result.getData().getTitle());
        verify(permissionService).grantOwner(any(Document.class), eq(mockUser));
    }

    @Test
    void getDocument_shouldThrowOnNotFound() {
        when(documentRepository.findById("nonexistent")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> documentService.getDocument("nonexistent"));
    }

    @Test
    void updateDocument_shouldCheckOwnership() {
        User otherOwner = User.builder().id(99L).username("other").build();
        Document doc = Document.builder()
                .id("doc-1").title("Title").owner(otherOwner).ownerName("other").build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        assertThrows(AccessDeniedException.class,
                () -> documentService.updateDocumentMeta("doc-1", "New Title", null));
    }

    @Test
    void listMyDocuments_shouldReturnPaged() {
        Document doc = Document.builder().id("doc-1").title("Mine").owner(mockUser)
                .ownerName("Test User").wordCount(0).charCount(0).build();
        Page<Document> page = new PageImpl<>(List.of(doc));
        when(documentRepository.findByOwnerId(eq(1L), any(Pageable.class))).thenReturn(page);
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        var result = documentService.listMyDocuments(0, 20);
        assertEquals(1, result.getData().getTotalElements());
    }
}
