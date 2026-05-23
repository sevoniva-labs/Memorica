package sevoniva.memorica.task;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DataCleanupTask {

    private static final Logger log = LoggerFactory.getLogger(DataCleanupTask.class);

    private final JdbcTemplate jdbcTemplate;

    public DataCleanupTask(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Remove document_states that haven't been updated in 90 days.
     * These are orphaned Yjs states from deleted or abandoned documents.
     */
    @Scheduled(cron = "0 0 3 * * ?") // daily at 3 AM
    public void cleanupStaleDocumentStates() {
        int deleted = jdbcTemplate.update(
            "DELETE FROM document_states WHERE updated_at < NOW() - INTERVAL '90 days'"
        );
        if (deleted > 0) {
            log.info("Cleaned up {} stale document states", deleted);
        }
    }

    /**
     * Purge audit logs older than 1 year for storage management.
     */
    @Scheduled(cron = "0 30 3 * * ?") // daily at 3:30 AM
    public void purgeOldAuditLogs() {
        int deleted = jdbcTemplate.update(
            "DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '1 year'"
        );
        if (deleted > 0) {
            log.info("Purged {} old audit log entries", deleted);
        }
    }
}
