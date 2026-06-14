package sevoniva.memorica.service.ai;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import sevoniva.memorica.config.AiProperties;
import sevoniva.memorica.dto.AiGenerateRequest;
import sevoniva.memorica.dto.AiGenerateResponse;
import sevoniva.memorica.entity.Document;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.exception.AccessDeniedException;
import sevoniva.memorica.exception.BadRequestException;
import sevoniva.memorica.repository.DocumentRepository;
import sevoniva.memorica.security.UserDetailsImpl;
import sevoniva.memorica.service.PermissionService;
import sevoniva.memorica.service.WorkspaceService;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class AiServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private PermissionService permissionService;
    @Mock
    private WorkspaceService workspaceService;

    private TestAiProvider provider;
    private AiService aiService;

    @BeforeEach
    void setUp() {
        AiProperties properties = new AiProperties();
        properties.setProvider("test");
        provider = new TestAiProvider();
        aiService = new AiService(properties, List.of(provider),
                documentRepository, permissionService, workspaceService);

        User user = User.builder().id(1L).username("test").email("test@example.com").build();
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void generate_shouldRequireDocumentContext() {
        AiGenerateRequest request = request();

        assertThrows(BadRequestException.class, () -> aiService.generate(request));
        assertEquals(0, provider.calls);
    }

    @Test
    void generate_shouldDenyUserWithoutWriteAccess() {
        User owner = User.builder().id(99L).username("owner").build();
        Document doc = Document.builder()
                .id("doc-1").title("Private").owner(owner).ownerName("owner")
                .workspaceId("team-1").isPublic(false).build();
        lenient().when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        lenient().when(permissionService.canWrite("doc-1", 1L)).thenReturn(false);

        assertThrows(AccessDeniedException.class, () -> aiService.generate(request("doc-1")));
        assertEquals(0, provider.calls);
    }

    @Test
    void generate_shouldAllowUserWithWriteAccess() {
        User owner = User.builder().id(99L).username("owner").build();
        Document doc = Document.builder()
                .id("doc-1").title("Shared").owner(owner).ownerName("owner")
                .workspaceId("team-1").isPublic(false).build();
        lenient().when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        lenient().when(permissionService.canWrite("doc-1", 1L)).thenReturn(true);

        AiGenerateResponse response = aiService.generate(request("doc-1"));

        assertEquals("generated", response.getText());
        assertEquals(1, provider.calls);
    }

    private AiGenerateRequest request() {
        return request(null);
    }

    private AiGenerateRequest request(String documentId) {
        AiGenerateRequest request = new AiGenerateRequest();
        request.setDocumentId(documentId);
        request.setAction("summarize");
        request.setText("Memorica");
        return request;
    }

    private static class TestAiProvider implements AiProvider {
        int calls;

        @Override
        public String name() {
            return "test";
        }

        @Override
        public AiCompletionResponse generate(AiCompletionRequest request) {
            calls++;
            return new AiCompletionResponse("test", "fake-model", "generated");
        }
    }
}
