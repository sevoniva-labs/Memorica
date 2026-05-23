package sevoniva.memorica.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "document_permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentPermission {

    public static final String ROLE_OWNER = "owner";
    public static final String ROLE_EDITOR = "editor";
    public static final String ROLE_VIEWER = "viewer";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private String documentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    @Builder.Default
    private String role = ROLE_VIEWER;

    @Column(name = "granted_by")
    private Long grantedBy;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
