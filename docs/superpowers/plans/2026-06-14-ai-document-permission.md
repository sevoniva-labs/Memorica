# AI Document Permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require AI generation requests to carry document context and allow only users who can edit that document to invoke AI operations.

**Architecture:** Keep `/api/v1/ai/generate` as the single API endpoint, but extend `AiGenerateRequest` with `documentId`. `AiService` validates the document id, checks write access against the existing document/workspace/permission model, then calls the configured provider only after authorization succeeds. Frontend editor passes its current `docId` into `AIAssistant`, which includes it in `generateAI`.

**Tech Stack:** Java 21, Spring Boot 3.5, JUnit 5, Mockito, React 19, TypeScript, Vite, Ant Design.

---

### Task 1: Require Document Context

**Files:**
- Create: `backend/src/test/java/sevoniva/memorica/service/ai/AiServiceTest.java`
- Modify: `backend/src/main/java/sevoniva/memorica/dto/AiGenerateRequest.java`
- Modify: `backend/src/main/java/sevoniva/memorica/service/ai/AiService.java`

- [ ] **Step 1: Write the failing test**

```java
@Test
void generate_shouldRequireDocumentContext() {
    AiGenerateRequest request = request(null);

    assertThrows(BadRequestException.class, () -> aiService.generate(request));
    assertEquals(0, provider.calls);
}
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd backend
JWT_SECRET=memorica-development-jwt-secret-2026-local-preview ./gradlew test --tests sevoniva.memorica.service.ai.AiServiceTest
```

Expected before implementation: FAIL because `AiService.generate` calls the provider even when the request has no document context.

- [ ] **Step 3: Add `documentId` to the request and reject blank values**

Add a `documentId` field to `AiGenerateRequest` and make `AiService.generate` throw `BadRequestException("缺少文档上下文")` before provider lookup when it is blank.

- [ ] **Step 4: Run GREEN**

Run the same `AiServiceTest` command. Expected after implementation: PASS.

### Task 2: Enforce Edit Permission

**Files:**
- Modify: `backend/src/test/java/sevoniva/memorica/service/ai/AiServiceTest.java`
- Modify: `backend/src/main/java/sevoniva/memorica/service/ai/AiService.java`

- [ ] **Step 1: Add unauthorized and authorized tests**

Add tests for both outcomes:

```java
@Test
void generate_shouldDenyUserWithoutWriteAccess() {
    User owner = User.builder().id(99L).username("owner").build();
    Document doc = Document.builder()
            .id("doc-1").title("Private").owner(owner).ownerName("owner")
            .workspaceId("team-1").isPublic(false).build();
    when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
    when(permissionService.canWrite("doc-1", 1L)).thenReturn(false);

    assertThrows(AccessDeniedException.class, () -> aiService.generate(request("doc-1")));
    assertEquals(0, provider.calls);
}

@Test
void generate_shouldAllowUserWithWriteAccess() {
    User owner = User.builder().id(99L).username("owner").build();
    Document doc = Document.builder()
            .id("doc-1").title("Shared").owner(owner).ownerName("owner")
            .workspaceId("team-1").isPublic(false).build();
    when(documentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
    when(permissionService.canWrite("doc-1", 1L)).thenReturn(true);

    AiGenerateResponse response = aiService.generate(request("doc-1"));

    assertEquals("generated", response.getText());
    assertEquals(1, provider.calls);
}
```

- [ ] **Step 2: Run RED**

Run the same `AiServiceTest` command. Expected before permission implementation: FAIL because requests with any document id still reach the provider.

- [ ] **Step 3: Add write-access guard**

Load the document by `documentId`, reject deleted documents, and allow only owner, workspace manager, or explicit document writer to call the provider.

- [ ] **Step 4: Run GREEN**

Run the same `AiServiceTest` command. Expected after implementation: PASS.

### Task 3: Frontend Contract

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/components/AIAssistant.tsx`
- Modify: `frontend/src/components/CollabEditor.tsx`
- Modify: `frontend/e2e/helpers/api.ts`
- Modify: `frontend/e2e/editor-regression.spec.ts`

- [ ] **Step 1: Pass document id through AI calls**

Add `documentId` to the frontend `AIGenerateRequest` type, pass it from `CollabEditor` into `AIAssistant`, and include it in `generateAI`.

- [ ] **Step 2: Update optional AI E2E helper**

Update `generateAI` helper to create or accept a document id so provider-backed AI tests use the new contract.

### Task 4: Verification And Commit

**Files:**
- Verify all files above.

- [ ] **Step 1: Run verification**

```bash
cd backend && JWT_SECRET=memorica-development-jwt-secret-2026-local-preview ./gradlew test --tests sevoniva.memorica.service.ai.AiServiceTest
cd backend && JWT_SECRET=memorica-development-jwt-secret-2026-local-preview ./gradlew test
cd frontend && npm run lint
cd frontend && npm run build
git diff --check
```

- [ ] **Step 2: Commit and push**

```bash
git add docs/superpowers/plans/2026-06-14-ai-document-permission.md backend/src/main/java/sevoniva/memorica/dto/AiGenerateRequest.java backend/src/main/java/sevoniva/memorica/service/ai/AiService.java backend/src/test/java/sevoniva/memorica/service/ai/AiServiceTest.java frontend/src/api/client.ts frontend/src/components/AIAssistant.tsx frontend/src/components/CollabEditor.tsx frontend/e2e/helpers/api.ts frontend/e2e/editor-regression.spec.ts
git commit -m "fix: require document edit access for ai"
git push
```
