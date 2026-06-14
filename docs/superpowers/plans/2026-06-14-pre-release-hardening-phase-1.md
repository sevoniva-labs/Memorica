# Pre-Release Hardening Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize Memorica's local development and verification workflow so localhost/127.0.0.1, Makefile commands, CI checks, and backend test categories are predictable.

**Architecture:** Keep application behavior unchanged except for allowing both common local browser origins. Split verification commands by responsibility in Makefile and Gradle so unit checks can run without Testcontainers while integration checks remain explicit.

**Tech Stack:** Spring Boot 3.5, Gradle, Testcontainers, React 19, Vite, Playwright, Ant Design CLI, Make, GitHub Actions.

---

## File Structure

- Modify `backend/src/main/java/sevoniva/memorica/config/SecurityConfig.java`
  - Trim comma-separated CORS origins so environment variables with spaces work.
- Modify `backend/src/main/resources/application.yml`
  - Allow both `http://localhost:5173` and `http://127.0.0.1:5173` in the local default CORS origins.
- Modify `backend/src/test/resources/application-test.yml`
  - Mirror local CORS origins for security tests.
- Modify `backend/src/test/java/sevoniva/memorica/controller/AuthControllerSecurityTest.java`
  - Add preflight coverage for both local origins.
- Modify `backend/build.gradle`
  - Exclude integration tests from default `test`; add explicit `integrationTest`; keep `check` running both.
- Modify `Makefile`
  - Add `frontend-check`, `e2e-local`, `backend-unit-test`, `backend-integration-test`, and `verify-local`.
- Modify `.github/workflows/ci.yml`
  - Run Ant Design checks in frontend CI and keep audit on npmjs registry.
- Modify `README.md` and `frontend/README.md`
  - Document host expectations, local verification commands, Testcontainers, and audit registry behavior.

## Task 1: Local CORS Stability

- [ ] Add failing MockMvc tests for `http://localhost:5173` and `http://127.0.0.1:5173` preflight requests to `/api/v1/auth/me`.
- [ ] Run `JWT_SECRET=memorica-development-jwt-secret-2026-local-preview ./gradlew test --tests 'sevoniva.memorica.controller.AuthControllerSecurityTest'` and verify the 127.0.0.1 test fails.
- [ ] Update default/test CORS origins and trim configured origins in `SecurityConfig`.
- [ ] Rerun the same focused backend test and verify it passes.

## Task 2: Backend Test Categories

- [ ] Change Gradle `test` to exclude `sevoniva.memorica.integration.*`.
- [ ] Add an `integrationTest` task that includes only `sevoniva.memorica.integration.*`.
- [ ] Ensure `check` depends on `test`, `integrationTest`, and coverage verification.
- [ ] Run backend unit test command and verify it does not require Testcontainers.
- [ ] Run integration test command and record whether local Docker/Testcontainers is available.

## Task 3: Local Verification Commands

- [ ] Add Makefile targets for frontend, E2E, backend unit, backend integration, and local verification.
- [ ] Keep npm audit using `https://registry.npmjs.org` because npmmirror does not provide a stable npm audit endpoint.
- [ ] Run `make help` and verify the new commands are listed.

## Task 4: CI And Documentation

- [ ] Add `npm run antd:doctor` and `npm run antd:lint` to frontend CI.
- [ ] Update README files with the preferred `localhost:5173` URL, the supported `127.0.0.1:5173` CORS behavior, local verification commands, and Testcontainers notes.
- [ ] Run frontend lint/build/AntD checks and relevant backend tests.
- [ ] Commit and push phase 1 changes.
