package com.collabdoc.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DocumentResponse {
    private String id;
    private String title;
    private String ownerName;
    private Integer wordCount;
    private Integer charCount;
    private String coverImage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
