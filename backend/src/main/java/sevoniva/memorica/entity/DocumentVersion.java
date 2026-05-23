package sevoniva.memorica.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "document_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String documentId;

    @Column(nullable = false)
    private Integer versionNumber;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contentJson;

    @Column
    private String snapshotHtml;

    @Column
    private Integer wordCount;

    @Column
    private Integer charCount;

    @Column
    private String editorName;

    @Version
    private Long version;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
