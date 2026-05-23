package sevoniva.memorica.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Gauge;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

import javax.sql.DataSource;
import java.util.concurrent.atomic.AtomicLong;

@Configuration
public class MetricsConfig {

    private final AtomicLong userCount = new AtomicLong(0);
    private final AtomicLong documentCount = new AtomicLong(0);
    private final AtomicLong activeVersionCount = new AtomicLong(0);
    private final DataSource dataSource;
    private final HealthEndpoint healthEndpoint;

    public MetricsConfig(MeterRegistry registry, DataSource dataSource, HealthEndpoint healthEndpoint) {
        this.dataSource = dataSource;
        this.healthEndpoint = healthEndpoint;

        Gauge.builder("memorica.users.total", userCount, AtomicLong::get)
                .description("Total registered users")
                .register(registry);

        Gauge.builder("memorica.documents.total", documentCount, AtomicLong::get)
                .description("Total documents")
                .register(registry);

        Gauge.builder("memorica.versions.total", activeVersionCount, AtomicLong::get)
                .description("Total document versions")
                .register(registry);

        Gauge.builder("memorica.health", () -> {
                    Status status = healthEndpoint.health().getStatus();
                    return Status.UP.equals(status) ? 1 : 0;
                })
                .description("Application health (1=UP, 0=DOWN)")
                .register(registry);
    }

    @Scheduled(fixedRate = 60_000) // Refresh business metrics every 60s
    public void refreshMetrics() {
        try (var conn = dataSource.getConnection();
             var stmt1 = conn.createStatement();
             var stmt2 = conn.createStatement();
             var stmt3 = conn.createStatement()) {

            var rs1 = stmt1.executeQuery("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL");
            if (rs1.next()) userCount.set(rs1.getLong(1));

            var rs2 = stmt2.executeQuery("SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL");
            if (rs2.next()) documentCount.set(rs2.getLong(1));

            var rs3 = stmt3.executeQuery("SELECT COUNT(*) FROM document_versions");
            if (rs3.next()) activeVersionCount.set(rs3.getLong(1));

        } catch (Exception e) {
            // Metrics refresh failure should not affect application
        }
    }
}
