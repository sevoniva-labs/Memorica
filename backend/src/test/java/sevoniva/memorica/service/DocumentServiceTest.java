package sevoniva.memorica.service;

import sevoniva.memorica.entity.Document;
import sevoniva.memorica.entity.DocumentPermission;
import sevoniva.memorica.entity.DocumentUserState;
import sevoniva.memorica.entity.DocumentVersion;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.exception.AccessDeniedException;
import sevoniva.memorica.exception.ResourceNotFoundException;
import sevoniva.memorica.repository.DocumentRepository;
import sevoniva.memorica.repository.DocumentUserStateRepository;
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
    private DocumentUserStateRepository documentUserStateRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PermissionService permissionService;
    @Mock
    private AuditService auditService;
    @Mock
    private WorkspaceService workspaceService;

    private DocumentService documentService;
    private User mockUser;

    @BeforeEach
    void setUp() {
        documentService = new DocumentService(documentRepository,
                documentVersionRepository, documentUserStateRepository, userRepository,
                permissionService, auditService, workspaceService);
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
        when(workspaceService.defaultWorkspaceId(mockUser)).thenReturn("personal-1");
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        var result = documentService.createDocument("Test Doc");
        assertNotNull(result.getData());
        assertEquals("Test Doc", result.getData().getTitle());
        assertEquals("personal-1", result.getData().getWorkspaceId());
        verify(permissionService).grantOwner(any(Document.class), eq(mockUser));
    }

    @Test
    void createDocument_shouldUseRequestedWorkspaceWhenUserIsMember() {
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));
        when(workspaceService.canAccess("team-1", 1L)).thenReturn(true);
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        var result = documentService.createDocument("Team Doc", "team-1");

        assertEquals("team-1", result.getData().getWorkspaceId());
        verify(workspaceService, never()).defaultWorkspaceId(any());
    }

    @Test
    void createDocument_shouldDenyRequestedWorkspaceWhenUserIsNotMember() {
        when(workspaceService.canAccess("team-1", 1L)).thenReturn(false);
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        assertThrows(AccessDeniedException.class,
                () -> documentService.createDocument("Team Doc", "team-1"));
        verify(documentRepository, never()).save(any());
    }

    @Test
    void getDocument_shouldThrowOnNotFound() {
        when(documentRepository.findById("nonexistent")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> documentService.getDocument("nonexistent"));
    }

    @Test
    void getDocument_shouldAllowPublicDocument() {
        User otherOwner = User.builder().id(99L).username("other").build();
        Document doc = Document.builder()
                .id("doc-1").title("Public").owner(otherOwner).ownerName("other").isPublic(true).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));

        var result = documentService.getDocument("doc-1");

        assertEquals("Public", result.getData().getTitle());
    }

    @Test
    void getDocument_shouldDenyPrivateDocumentWithoutPermission() {
        User otherOwner = User.builder().id(99L).username("other").build();
        Document doc = Document.builder()
                .id("doc-1").title("Private").owner(otherOwner).ownerName("other").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(permissionService.canRead("doc-1", 1L)).thenReturn(false);

        assertThrows(AccessDeniedException.class, () -> documentService.getDocument("doc-1"));
    }

    @Test
    void getDocument_shouldAllowSharedViewer() {
        User otherOwner = User.builder().id(99L).username("other").build();
        Document doc = Document.builder()
                .id("doc-1").title("Shared").owner(otherOwner).ownerName("other").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(permissionService.canRead("doc-1", 1L)).thenReturn(true);

        var result = documentService.getDocument("doc-1");

        assertEquals("Shared", result.getData().getTitle());
        assertFalse(result.getData().getCanWrite());
        assertFalse(result.getData().getCanManage());
    }

    @Test
    void getDocument_shouldAllowWorkspaceMember() {
        User otherOwner = User.builder().id(99L).username("other").build();
        Document doc = Document.builder()
                .id("doc-1").title("Team").owner(otherOwner).ownerName("other")
                .workspaceId("team-1").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(workspaceService.canAccess("team-1", 1L)).thenReturn(true);

        var result = documentService.getDocument("doc-1");

        assertEquals("Team", result.getData().getTitle());
        assertFalse(result.getData().getCanWrite());
        assertFalse(result.getData().getCanManage());
    }

    @Test
    void updateDocument_shouldCheckOwnership() {
        User otherOwner = User.builder().id(99L).username("other").build();
        Document doc = Document.builder()
                .id("doc-1").title("Title").owner(otherOwner).ownerName("other").build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));

        assertThrows(AccessDeniedException.class,
                () -> documentService.updateDocumentMeta("doc-1", "New Title", null));
    }

    @Test
    void updateDocument_shouldAllowWorkspaceAdmin() {
        User otherOwner = User.builder().id(99L).username("other").build();
        Document doc = Document.builder()
                .id("doc-1").title("Title").owner(otherOwner).ownerName("other")
                .workspaceId("team-1").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(workspaceService.canManage("team-1", 1L)).thenReturn(true);
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = documentService.updateDocumentMeta("doc-1", "New Title", null);

        assertEquals("New Title", result.getData().getTitle());
    }

    @Test
    void listMyDocuments_shouldReturnPaged() {
        Document doc = Document.builder().id("doc-1").title("Mine").owner(mockUser)
                .ownerName("Test User").wordCount(0).charCount(0).build();
        Page<Document> page = new PageImpl<>(List.of(doc));
        when(documentRepository.findByOwnerIdAndDeletedAtIsNullAndParentIdIsNull(eq(1L), any(Pageable.class))).thenReturn(page);

        var result = documentService.listMyDocuments(0, 20);
        assertEquals(1, result.getData().getTotalElements());
    }

    @Test
    void listSharedDocuments_shouldReturnDocumentsGrantedToCurrentUser() {
        User owner = User.builder().id(2L).username("owner").displayName("Owner").build();
        Document doc = Document.builder().id("doc-1").title("Shared").owner(owner)
                .ownerName("Owner").workspaceId("team-1").wordCount(0).charCount(0).isPublic(false).build();
        Page<Document> page = new PageImpl<>(List.of(doc));
        when(documentRepository.findSharedWithUser(eq(1L), eq(DocumentPermission.ROLE_OWNER), any(Pageable.class)))
                .thenReturn(page);
        when(permissionService.canWrite("doc-1", 1L)).thenReturn(true);

        var result = documentService.listSharedDocuments(0, 20, null);

        assertEquals(1, result.getData().getTotalElements());
        assertEquals("Shared", result.getData().getContent().get(0).getTitle());
        assertEquals(Boolean.TRUE, result.getData().getContent().get(0).getCanWrite());
    }

    @Test
    void listWorkspaceDocuments_shouldReturnPagedForMember() {
        Document doc = Document.builder().id("doc-1").title("Team").owner(mockUser)
                .ownerName("Test User").workspaceId("team-1").wordCount(0).charCount(0).build();
        Page<Document> page = new PageImpl<>(List.of(doc));
        when(workspaceService.canAccess("team-1", 1L)).thenReturn(true);
        when(documentRepository.findByWorkspaceIdAndDeletedAtIsNullAndParentIdIsNull(eq("team-1"), any(Pageable.class))).thenReturn(page);

        var result = documentService.listWorkspaceDocuments("team-1", 0, 20);

        assertEquals(1, result.getData().getTotalElements());
        assertEquals("team-1", result.getData().getContent().get(0).getWorkspaceId());
    }

    @Test
    void listWorkspaceDocuments_shouldSearchByTitleForMember() {
        Document doc = Document.builder().id("doc-1").title("Roadmap").owner(mockUser)
                .ownerName("Test User").workspaceId("team-1").wordCount(0).charCount(0).build();
        Page<Document> page = new PageImpl<>(List.of(doc));
        when(workspaceService.canAccess("team-1", 1L)).thenReturn(true);
        when(documentRepository.findByWorkspaceIdAndDeletedAtIsNullAndTitleContainingIgnoreCase(eq("team-1"), eq("road"), any(Pageable.class)))
                .thenReturn(page);

        var result = documentService.listWorkspaceDocuments("team-1", 0, 20, "road");

        assertEquals(1, result.getData().getTotalElements());
        verify(documentRepository).findByWorkspaceIdAndDeletedAtIsNullAndTitleContainingIgnoreCase(eq("team-1"), eq("road"), any(Pageable.class));
    }

    @Test
    void listWorkspaceDocuments_shouldDenyNonMember() {
        when(workspaceService.canAccess("team-1", 1L)).thenReturn(false);

        assertThrows(AccessDeniedException.class,
                () -> documentService.listWorkspaceDocuments("team-1", 0, 20));
        verify(documentRepository, never()).findByWorkspaceIdAndDeletedAtIsNullAndParentIdIsNull(anyString(), any());
    }

    @Test
    void createFolder_shouldCreateFolderInWorkspace() {
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));
        when(workspaceService.canAccess("team-1", 1L)).thenReturn(true);
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        var result = documentService.createFolder("项目资料", "team-1", null);

        assertEquals("项目资料", result.getData().getTitle());
        assertEquals(Document.TYPE_FOLDER, result.getData().getItemType());
        assertEquals("team-1", result.getData().getWorkspaceId());
        verify(permissionService).grantOwner(any(Document.class), eq(mockUser));
    }

    @Test
    void createDocument_shouldAttachToParentFolder() {
        Document folder = Document.builder()
                .id("folder-1").title("Folder").owner(mockUser).ownerName("Test User")
                .workspaceId("team-1").itemType(Document.TYPE_FOLDER).isPublic(false).build();
        when(documentRepository.findById("folder-1")).thenReturn(Optional.of(folder));
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));
        when(workspaceService.canAccess("team-1", 1L)).thenReturn(true);
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        var result = documentService.createDocument("Child", "team-1", "folder-1");

        assertEquals("folder-1", result.getData().getParentId());
        assertEquals(Document.TYPE_DOCUMENT, result.getData().getItemType());
    }

    @Test
    void listWorkspaceDocuments_shouldReturnFolderChildren() {
        Document doc = Document.builder().id("doc-1").title("Child").owner(mockUser)
                .ownerName("Test User").workspaceId("team-1").parentId("folder-1").wordCount(0).charCount(0).build();
        Page<Document> page = new PageImpl<>(List.of(doc));
        when(workspaceService.canAccess("team-1", 1L)).thenReturn(true);
        when(documentRepository.findByWorkspaceIdAndDeletedAtIsNullAndParentId(eq("team-1"), eq("folder-1"), any(Pageable.class)))
                .thenReturn(page);

        var result = documentService.listWorkspaceDocuments("team-1", 0, 20, null, "folder-1");

        assertEquals(1, result.getData().getTotalElements());
        assertEquals("folder-1", result.getData().getContent().get(0).getParentId());
    }

    @Test
    void listWorkspaceFolders_shouldReturnOnlyFolders() {
        Document folder = Document.builder()
                .id("folder-1").title("Folder").owner(mockUser).ownerName("Test User")
                .workspaceId("team-1").itemType(Document.TYPE_FOLDER).build();
        when(workspaceService.canAccess("team-1", 1L)).thenReturn(true);
        when(documentRepository.findByWorkspaceIdAndDeletedAtIsNullAndItemTypeOrderByTitleAsc("team-1", Document.TYPE_FOLDER))
                .thenReturn(List.of(folder));

        var result = documentService.listWorkspaceFolders("team-1");

        assertEquals(1, result.getData().size());
        assertEquals(Document.TYPE_FOLDER, result.getData().get(0).getItemType());
    }

    @Test
    void moveDocument_shouldMoveIntoFolder() {
        Document doc = Document.builder()
                .id("doc-1").title("Child").owner(mockUser).ownerName("Test User")
                .workspaceId("team-1").itemType(Document.TYPE_DOCUMENT).build();
        Document folder = Document.builder()
                .id("folder-1").title("Folder").owner(mockUser).ownerName("Test User")
                .workspaceId("team-1").itemType(Document.TYPE_FOLDER).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(documentRepository.findById("folder-1")).thenReturn(Optional.of(folder));
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = documentService.moveDocument("doc-1", "folder-1");

        assertEquals("folder-1", result.getData().getParentId());
        assertEquals("folder-1", doc.getParentId());
    }

    @Test
    void moveDocument_shouldMoveToRoot() {
        Document doc = Document.builder()
                .id("doc-1").title("Child").owner(mockUser).ownerName("Test User")
                .workspaceId("team-1").parentId("folder-1").itemType(Document.TYPE_DOCUMENT).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = documentService.moveDocument("doc-1", null);

        assertNull(result.getData().getParentId());
        assertNull(doc.getParentId());
    }

    @Test
    void moveDocument_shouldDenyMovingFolderIntoDescendant() {
        Document folder = Document.builder()
                .id("folder-1").title("Folder").owner(mockUser).ownerName("Test User")
                .workspaceId("team-1").itemType(Document.TYPE_FOLDER).build();
        Document childFolder = Document.builder()
                .id("folder-2").title("Child Folder").owner(mockUser).ownerName("Test User")
                .workspaceId("team-1").parentId("folder-1").itemType(Document.TYPE_FOLDER).build();
        when(documentRepository.findById("folder-1")).thenReturn(Optional.of(folder));
        when(documentRepository.findById("folder-2")).thenReturn(Optional.of(childFolder));

        assertThrows(AccessDeniedException.class, () -> documentService.moveDocument("folder-1", "folder-2"));
        verify(documentRepository, never()).save(any(Document.class));
    }

    @Test
    void getDocument_shouldMarkRecentAccess() {
        Document doc = Document.builder()
                .id("doc-1").title("Mine").owner(mockUser).ownerName("Test User").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(documentUserStateRepository.findByDocumentIdAndUserId("doc-1", 1L)).thenReturn(Optional.empty());

        var result = documentService.getDocument("doc-1");

        assertEquals("Mine", result.getData().getTitle());
        assertTrue(result.getData().getCanWrite());
        assertTrue(result.getData().getCanManage());
        verify(documentUserStateRepository).upsertLastOpened("doc-1", 1L);
    }

    @Test
    void setFavorite_shouldPersistUserState() {
        Document doc = Document.builder()
                .id("doc-1").title("Mine").owner(mockUser).ownerName("Test User").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(documentUserStateRepository.findByDocumentIdAndUserId("doc-1", 1L)).thenReturn(Optional.empty());

        var result = documentService.setFavorite("doc-1", true);

        assertEquals("Mine", result.getData().getTitle());
        verify(documentUserStateRepository).upsertFavorite("doc-1", 1L, true);
    }

    @Test
    void deleteDocument_shouldSoftDelete() {
        Document doc = Document.builder()
                .id("doc-1").title("Mine").owner(mockUser).ownerName("Test User").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        documentService.deleteDocument("doc-1");

        assertNotNull(doc.getDeletedAt());
        verify(documentRepository).save(doc);
        verify(documentRepository, never()).delete(any(Document.class));
    }

    @Test
    void deleteDocument_shouldSoftDeleteFolderChildren() {
        Document folder = Document.builder()
                .id("folder-1").title("Folder").owner(mockUser).ownerName("Test User")
                .workspaceId("team-1").itemType(Document.TYPE_FOLDER).build();
        Document child = Document.builder()
                .id("doc-1").title("Child").owner(mockUser).ownerName("Test User")
                .workspaceId("team-1").parentId("folder-1").itemType(Document.TYPE_DOCUMENT).build();
        when(documentRepository.findById("folder-1")).thenReturn(Optional.of(folder));
        when(documentRepository.findByParentIdAndDeletedAtIsNull("folder-1")).thenReturn(List.of(child));
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        documentService.deleteDocument("folder-1");

        assertNotNull(folder.getDeletedAt());
        assertNotNull(child.getDeletedAt());
        verify(documentRepository).save(folder);
        verify(documentRepository).save(child);
    }

    @Test
    void restoreDocument_shouldClearDeletedAt() {
        Document doc = Document.builder()
                .id("doc-1").title("Mine").owner(mockUser).ownerName("Test User").isPublic(false)
                .deletedAt(java.time.LocalDateTime.now()).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = documentService.restoreDocument("doc-1");

        assertNull(result.getData().getDeletedAt());
        assertNull(doc.getDeletedAt());
    }

    @Test
    void saveVersion_shouldDenyEditorWithoutWritePermission() {
        User otherOwner = User.builder().id(99L).username("other").build();
        Document doc = Document.builder()
                .id("doc-1").title("Private").owner(otherOwner).ownerName("other").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(permissionService.canWrite("doc-1", 1L)).thenReturn(false);
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        assertThrows(AccessDeniedException.class,
                () -> documentService.saveVersion("doc-1", "{}", "<p>x</p>", 1, 1));
        verify(documentVersionRepository, never()).save(any(DocumentVersion.class));
    }

    @Test
    void saveVersion_shouldAllowWorkspaceAdmin() {
        User otherOwner = User.builder().id(99L).username("other").build();
        Document doc = Document.builder()
                .id("doc-1").title("Team").owner(otherOwner).ownerName("other")
                .workspaceId("team-1").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(workspaceService.canManage("team-1", 1L)).thenReturn(true);
        when(documentVersionRepository.findTopByDocumentIdOrderByVersionNumberDesc("doc-1"))
                .thenReturn(Optional.empty());
        when(documentVersionRepository.save(any(DocumentVersion.class))).thenAnswer(inv -> inv.getArgument(0));
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        var result = documentService.saveVersion("doc-1", "{}", "<p>x</p>", 2, 3);

        assertEquals(1, ((java.util.Map<?, ?>) result.getData()).get("version"));
        assertEquals(2, doc.getWordCount());
        assertEquals(3, doc.getCharCount());
    }

    @Test
    void saveVersion_shouldAllowOwner() {
        Document doc = Document.builder()
                .id("doc-1").title("Mine").owner(mockUser).ownerName("Test User").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(documentVersionRepository.findTopByDocumentIdOrderByVersionNumberDesc("doc-1"))
                .thenReturn(Optional.empty());
        when(documentVersionRepository.save(any(DocumentVersion.class))).thenAnswer(inv -> inv.getArgument(0));
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        var result = documentService.saveVersion("doc-1", "{}", "<p>x</p>", 1, 1);

        assertEquals(1, ((java.util.Map<?, ?>) result.getData()).get("version"));
        assertEquals(1, doc.getWordCount());
        assertEquals(1, doc.getCharCount());
    }

    @Test
    void saveVersion_shouldSkipUnchangedContentAndUpdateStats() {
        Document doc = Document.builder()
                .id("doc-1").title("Mine").owner(mockUser).ownerName("Test User").isPublic(false).build();
        DocumentVersion existing = DocumentVersion.builder()
                .documentId("doc-1").versionNumber(3).contentJson("{\"same\":true}")
                .wordCount(1).charCount(1).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(documentVersionRepository.findTopByDocumentIdOrderByVersionNumberDesc("doc-1"))
                .thenReturn(Optional.of(existing));
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        var result = documentService.saveVersion("doc-1", "{\"same\":true}", "<p>x</p>", 4, 5, "auto");

        assertEquals(3, ((java.util.Map<?, ?>) result.getData()).get("version"));
        assertEquals(false, ((java.util.Map<?, ?>) result.getData()).get("saved"));
        assertEquals(4, doc.getWordCount());
        assertEquals(5, doc.getCharCount());
        verify(documentVersionRepository, never()).save(any(DocumentVersion.class));
        verify(auditService, never()).log(eq(1L), eq("test"), eq("DOCUMENT_VERSION_SAVE"),
                anyString(), anyString(), anyString(), any());
    }

    @Test
    void saveVersion_shouldNormalizeRestoreSource() {
        Document doc = Document.builder()
                .id("doc-1").title("Mine").owner(mockUser).ownerName("Test User").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(documentVersionRepository.findTopByDocumentIdOrderByVersionNumberDesc("doc-1"))
                .thenReturn(Optional.empty());
        when(documentVersionRepository.save(any(DocumentVersion.class))).thenAnswer(inv -> inv.getArgument(0));
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        var result = documentService.saveVersion("doc-1", "{\"restored\":true}", "<p>x</p>", 1, 1, "restore");

        assertEquals("restore", ((java.util.Map<?, ?>) result.getData()).get("source"));
        verify(auditService).log(eq(1L), eq("test"), eq("DOCUMENT_VERSION_SAVE"),
                eq("DOCUMENT"), eq("doc-1"), contains("restore"), isNull());
    }

    @Test
    void grantAccess_shouldAddCollaboratorForOwner() {
        User collaborator = User.builder()
                .id(2L).username("collab").displayName("Collab")
                .email("c@t.com").color("#2563eb")
                .build();
        Document doc = Document.builder()
                .id("doc-1").title("Mine").owner(mockUser).ownerName("Test User").isPublic(false).build();
        DocumentPermission ownerPermission = DocumentPermission.builder()
                .documentId("doc-1").userId(1L).role(DocumentPermission.ROLE_OWNER).build();
        DocumentPermission editorPermission = DocumentPermission.builder()
                .documentId("doc-1").userId(2L).role(DocumentPermission.ROLE_EDITOR).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(userRepository.findByUsername("collab")).thenReturn(Optional.of(collaborator));
        when(permissionService.listPermissions("doc-1")).thenReturn(List.of(ownerPermission, editorPermission));
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
        when(userRepository.findById(2L)).thenReturn(Optional.of(collaborator));

        var result = documentService.grantAccess("doc-1", "collab", DocumentPermission.ROLE_EDITOR);

        assertEquals(2, result.getData().getMembers().size());
        verify(permissionService).grantAccess("doc-1", 2L, DocumentPermission.ROLE_EDITOR, 1L);
        verify(auditService).log(eq(1L), eq("test"), eq("DOCUMENT_SHARE_GRANT"),
                eq("DOCUMENT"), eq("doc-1"), contains("collab"), isNull());
    }

    @Test
    void getSharing_shouldIncludeWorkspaceAccessContext() {
        Document doc = Document.builder()
                .id("doc-1").title("Mine").owner(mockUser).ownerName("Test User")
                .workspaceId("team-1").isPublic(false).build();
        DocumentPermission ownerPermission = DocumentPermission.builder()
                .documentId("doc-1").userId(1L).role(DocumentPermission.ROLE_OWNER).build();
        var workspaceMember = sevoniva.memorica.dto.WorkspaceMemberResponse.builder()
                .userId(2L)
                .username("space-member")
                .displayName("Space Member")
                .email("space@t.com")
                .role("member")
                .build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(permissionService.listPermissions("doc-1")).thenReturn(List.of(ownerPermission));
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
        when(workspaceService.workspaceName("team-1")).thenReturn("Team Space");
        when(workspaceService.listMemberResponses("team-1")).thenReturn(List.of(workspaceMember));

        var result = documentService.getSharing("doc-1");

        assertEquals("team-1", result.getData().getWorkspaceId());
        assertEquals("Team Space", result.getData().getWorkspaceName());
        assertEquals(1, result.getData().getWorkspaceMembers().size());
        assertEquals("space-member", result.getData().getWorkspaceMembers().get(0).getUsername());
    }

    @Test
    void revokeAccess_shouldDenyRemovingOwner() {
        Document doc = Document.builder()
                .id("doc-1").title("Mine").owner(mockUser).ownerName("Test User").isPublic(false).build();
        when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));

        assertThrows(AccessDeniedException.class, () -> documentService.revokeAccess("doc-1", 1L));
        verify(permissionService, never()).revokeAccess(anyString(), anyLong());
    }
}
