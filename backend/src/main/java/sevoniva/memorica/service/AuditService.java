package sevoniva.memorica.service;

import sevoniva.memorica.entity.AuditLog;
import sevoniva.memorica.repository.AuditLogRepository;
import org.slf4j.MDC;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Async("taskExecutor")
    public void log(Long userId, String username, String action,
                    String resourceType, String resourceId, String detail, String ipAddress) {
        AuditLog entry = AuditLog.builder()
                .userId(userId)
                .username(username)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .detail(detail)
                .ipAddress(ipAddress)
                .traceId(MDC.get("traceId"))
                .build();
        auditLogRepository.save(entry);
    }
}
