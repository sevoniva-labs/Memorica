# Editor Title Permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align backend document metadata permissions with the editor UI so users with write access can rename a document title while only managers can change public/share-level metadata.

**Architecture:** Keep `DocumentService.updateDocumentMeta` as the single backend entry point. Split permission checks by field: title updates require document write access; `isPublic` updates require manage access. Add service-level tests so the backend contract stays stable independent of frontend UI.

**Tech Stack:** Java 21, Spring Boot 3.5, JUnit 5, Mockito, existing Memorica service layer.

---

### Task 1: Regression Tests

**Files:**
- Modify: `backend/src/test/java/sevoniva/memorica/service/DocumentServiceTest.java`

- [ ] **Step 1: Add editor title rename test**

Add this test near the existing `updateDocument_shouldCheckOwnership` tests:

```java
@Test
void updateDocument_shouldAllowEditorToRenameTitle() {
    User otherOwner = User.builder().id(99L).username("other").build();
    Document doc = Document.builder()
            .id("doc-1").title("Title").owner(otherOwner).ownerName("other")
            .workspaceId("team-1").isPublic(false).build();
    when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
    when(permissionService.canWrite("doc-1", 1L)).thenReturn(true);
    when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

    var result = documentService.updateDocumentMeta("doc-1", "Editor Title", null);

    assertEquals("Editor Title", result.getData().getTitle());
    assertTrue(result.getData().getCanWrite());
    assertFalse(result.getData().getCanManage());
    verify(documentRepository).save(doc);
}
```

- [ ] **Step 2: Add visibility protection test**

Add this test next to the editor rename test:

```java
@Test
void updateDocument_shouldDenyEditorChangingVisibility() {
    User otherOwner = User.builder().id(99L).username("other").build();
    Document doc = Document.builder()
            .id("doc-1").title("Title").owner(otherOwner).ownerName("other")
            .workspaceId("team-1").isPublic(false).build();
    when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
    when(permissionService.canWrite("doc-1", 1L)).thenReturn(true);

    assertThrows(AccessDeniedException.class,
            () -> documentService.updateDocumentMeta("doc-1", null, true));
    verify(documentRepository, never()).save(any(Document.class));
}
```

- [ ] **Step 3: Run RED**

Run:

```bash
cd backend
JWT_SECRET=memorica-development-jwt-secret-2026-local-preview ./gradlew test --tests sevoniva.memorica.service.DocumentServiceTest
```

Expected before implementation: FAIL on `updateDocument_shouldAllowEditorToRenameTitle` because `updateDocumentMeta` currently requires manage access for all metadata updates.

### Task 2: Backend Permission Split

**Files:**
- Modify: `backend/src/main/java/sevoniva/memorica/service/DocumentService.java`

- [ ] **Step 1: Split update permission by field**

Update `updateDocumentMeta` to require write access for nonblank title changes and manage access for `isPublic` changes:

```java
@Transactional
public ApiResponse<DocumentResponse> updateDocumentMeta(String id, String title, Boolean isPublic) {
    Document doc = documentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("文档不存在"));
    boolean hasTitleUpdate = title != null && !title.isBlank();
    boolean hasVisibilityUpdate = isPublic != null;
    if (hasVisibilityUpdate) {
        checkManageAccess(doc);
    }
    if (hasTitleUpdate) {
        checkWriteAccess(doc);
        doc.setTitle(title);
    } else if (!hasVisibilityUpdate) {
        checkManageAccess(doc);
    }
    if (hasVisibilityUpdate) {
        doc.setIsPublic(isPublic);
    }
    documentRepository.save(doc);
    auditService.log(getCurrentUserId(), getCurrentUsername(), "DOCUMENT_UPDATE",
            "DOCUMENT", doc.getId(), "Document metadata updated", null);
    return ApiResponse.success(toResponse(doc));
}
```

- [ ] **Step 2: Run GREEN**

Run the same `DocumentServiceTest` command. Expected after implementation: PASS.

### Task 3: Verification And Commit

**Files:**
- Verify: `backend/src/main/java/sevoniva/memorica/service/DocumentService.java`
- Verify: `backend/src/test/java/sevoniva/memorica/service/DocumentServiceTest.java`
- Verify: `docs/superpowers/plans/2026-06-14-editor-title-permission.md`

- [ ] **Step 1: Run related verification**

Run:

```bash
cd backend && JWT_SECRET=memorica-development-jwt-secret-2026-local-preview ./gradlew test --tests sevoniva.memorica.service.DocumentServiceTest
git diff --check
```

- [ ] **Step 2: Commit and push**

Run:

```bash
git add docs/superpowers/plans/2026-06-14-editor-title-permission.md backend/src/main/java/sevoniva/memorica/service/DocumentService.java backend/src/test/java/sevoniva/memorica/service/DocumentServiceTest.java
git commit -m "fix: allow editors to rename documents"
git push
```
