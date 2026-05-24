package sevoniva.memorica.integration;

import sevoniva.memorica.entity.Document;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.repository.DocumentRepository;
import sevoniva.memorica.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class RepositoryIntegrationTest {

    static PostgreSQLContainer<?> postgres;

    static {
        postgres = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("memorica_it")
                .withUsername("test")
                .withPassword("test");
        postgres.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.flyway.enabled", () -> "false");
    }

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    private User owner;

    @BeforeEach
    void setUp() {
        owner = userRepository.save(User.builder()
                .username("owner-" + UUID.randomUUID().toString().substring(0, 8))
                .email("owner-" + UUID.randomUUID().toString().substring(0, 6) + "@it.com")
                .password("pass")
                .color("#22c55e")
                .displayName("IT Owner")
                .build());
    }

    @Test
    void shouldSaveAndFindUser() {
        assertNotNull(owner.getId());
        assertTrue(userRepository.findById(owner.getId()).isPresent());
        assertTrue(userRepository.existsByUsername(owner.getUsername()));
    }

    @Test
    void shouldNotFindNonexistentUser() {
        assertTrue(userRepository.findByUsername("nobody-" + UUID.randomUUID()).isEmpty());
    }

    @Test
    void shouldSaveAndFindDocument() {
        Document doc = Document.builder()
                .id(UUID.randomUUID().toString())
                .title("Integration Doc")
                .owner(owner)
                .ownerName("IT Owner")
                .workspaceId("personal-" + owner.getId())
                .wordCount(50)
                .charCount(200)
                .build();
        Document saved = documentRepository.save(doc);

        var found = documentRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("Integration Doc", found.get().getTitle());
    }

    @Test
    void shouldFindByOwnerPaged() {
        for (int i = 0; i < 3; i++) {
            documentRepository.save(Document.builder()
                    .id(UUID.randomUUID().toString())
                    .title("Doc " + i)
                    .owner(owner)
                    .ownerName("IT Owner")
                    .workspaceId("personal-" + owner.getId())
                    .build());
        }

        Page<Document> page = documentRepository.findByOwnerIdAndDeletedAtIsNull(owner.getId(), PageRequest.of(0, 2));
        assertEquals(2, page.getContent().size());
        assertTrue(page.getTotalElements() >= 3);
    }

    @Test
    void shouldFindPublicDocuments() {
        documentRepository.save(Document.builder()
                .id(UUID.randomUUID().toString())
                .title("Public Doc")
                .owner(owner)
                .ownerName("IT Owner")
                .workspaceId("personal-" + owner.getId())
                .isPublic(true)
                .build());

        Page<Document> page = documentRepository.findByIsPublicTrueAndDeletedAtIsNull(PageRequest.of(0, 10));
        assertTrue(page.getTotalElements() > 0);
    }
}
