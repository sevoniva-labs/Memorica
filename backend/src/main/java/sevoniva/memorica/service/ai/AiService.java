package sevoniva.memorica.service.ai;

import sevoniva.memorica.config.AiProperties;
import sevoniva.memorica.dto.AiGenerateRequest;
import sevoniva.memorica.dto.AiGenerateResponse;
import sevoniva.memorica.entity.Document;
import sevoniva.memorica.exception.AccessDeniedException;
import sevoniva.memorica.exception.AiProviderUnavailableException;
import sevoniva.memorica.exception.BadRequestException;
import sevoniva.memorica.exception.ResourceNotFoundException;
import sevoniva.memorica.repository.DocumentRepository;
import sevoniva.memorica.security.UserDetailsImpl;
import sevoniva.memorica.service.PermissionService;
import sevoniva.memorica.service.WorkspaceService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AiService {

    private final AiProperties properties;
    private final Map<String, AiProvider> providers;
    private final DocumentRepository documentRepository;
    private final PermissionService permissionService;
    private final WorkspaceService workspaceService;

    public AiService(AiProperties properties,
                     java.util.List<AiProvider> providers,
                     DocumentRepository documentRepository,
                     PermissionService permissionService,
                     WorkspaceService workspaceService) {
        this.properties = properties;
        this.providers = providers.stream()
                .collect(Collectors.toMap(provider -> provider.name().toLowerCase(Locale.ROOT), Function.identity()));
        this.documentRepository = documentRepository;
        this.permissionService = permissionService;
        this.workspaceService = workspaceService;
    }

    public AiGenerateResponse generate(AiGenerateRequest request) {
        String documentId = normalizeDocumentId(request.getDocumentId());
        if (documentId == null) {
            throw new BadRequestException("缺少文档上下文");
        }
        requireDocumentWriteAccess(documentId);

        AiProvider provider = providers.get(properties.getProvider().toLowerCase(Locale.ROOT));
        if (provider == null) {
            throw new AiProviderUnavailableException("AI provider 不存在: " + properties.getProvider());
        }

        String text = truncate(request.getText(), properties.getMaxInputChars());
        AiCompletionResponse response = provider.generate(new AiCompletionRequest(
                request.getAction(),
                text,
                request.getCustomPrompt()
        ));

        return AiGenerateResponse.builder()
                .provider(response.provider())
                .model(response.model())
                .text(response.text())
                .build();
    }

    private String normalizeDocumentId(String documentId) {
        return documentId != null && !documentId.isBlank() ? documentId.trim() : null;
    }

    private void requireDocumentWriteAccess(String documentId) {
        Long currentUserId = getCurrentUserId();
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
        if (doc.getDeletedAt() != null
                || (!doc.getOwner().getId().equals(currentUserId)
                && !workspaceService.canManage(doc.getWorkspaceId(), currentUserId)
                && !permissionService.canWrite(doc.getId(), currentUserId))) {
            throw new AccessDeniedException("无权在该文档中使用 AI");
        }
    }

    private String truncate(String value, int maxChars) {
        if (value == null || value.length() <= maxChars) {
            return value;
        }
        return value.substring(0, maxChars);
    }

    private Long getCurrentUserId() {
        UserDetailsImpl details = (UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return details.getId();
    }
}
