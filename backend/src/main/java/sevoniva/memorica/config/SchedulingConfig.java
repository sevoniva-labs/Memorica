package sevoniva.memorica.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulingConfig {
    // For multi-instance deployments, add ShedLock:
    //   implementation 'net.javacrumbs.shedlock:shedlock-spring:6.3.1'
    //   implementation 'net.javacrumbs.shedlock:shedlock-provider-jdbc-template:6.3.1'
    // Then annotate scheduled methods with @SchedulerLock(name = "...", lockAtMostFor = "PT10M")
}
