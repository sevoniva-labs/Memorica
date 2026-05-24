package sevoniva.memorica.service;

import sevoniva.memorica.entity.Document;
import sevoniva.memorica.entity.DocumentPermission;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.repository.DocumentPermissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class PermissionService {

    private final DocumentPermissionRepository permissionRepository;

    public PermissionService(DocumentPermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    @Transactional
    public void grantOwner(Document document, User user) {
        DocumentPermission perm = DocumentPermission.builder()
                .documentId(document.getId())
                .userId(user.getId())
                .role(DocumentPermission.ROLE_OWNER)
                .grantedBy(user.getId())
                .build();
        permissionRepository.save(perm);
    }

    @Transactional
    public void grantAccess(String documentId, Long userId, String role, Long grantedBy) {
        DocumentPermission perm = permissionRepository
                .findByDocumentIdAndUserId(documentId, userId)
                .orElse(DocumentPermission.builder()
                        .documentId(documentId)
                        .userId(userId)
                        .role(role)
                        .grantedBy(grantedBy)
                        .build());
        perm.setRole(role);
        permissionRepository.save(perm);
    }

    public boolean canRead(String documentId, Long userId) {
        return permissionRepository.existsByDocumentIdAndUserId(documentId, userId);
    }

    public boolean canWrite(String documentId, Long userId) {
        return permissionRepository.findByDocumentIdAndUserId(documentId, userId)
                .map(p -> DocumentPermission.ROLE_OWNER.equals(p.getRole())
                       || DocumentPermission.ROLE_EDITOR.equals(p.getRole()))
                .orElse(false);
    }

    public List<DocumentPermission> listPermissions(String documentId) {
        return permissionRepository.findByDocumentId(documentId);
    }

    public Optional<DocumentPermission> findPermission(String documentId, Long userId) {
        return permissionRepository.findByDocumentIdAndUserId(documentId, userId);
    }

    @Transactional
    public void revokeAccess(String documentId, Long userId) {
        permissionRepository.deleteByDocumentIdAndUserId(documentId, userId);
    }

    @Transactional
    public void revokeAll(String documentId) {
        permissionRepository.deleteByDocumentId(documentId);
    }
}
