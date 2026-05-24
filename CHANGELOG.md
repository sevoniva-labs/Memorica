# Changelog

All notable changes to Memorica will be documented here.

This project follows a pragmatic changelog format:

- `Added` for new capabilities.
- `Changed` for behavior changes.
- `Fixed` for bug fixes.
- `Security` for vulnerability, permission, or hardening changes.

## Unreleased

### Security

- Hardened document access checks across REST document details, version history, and version creation.
- Required authenticated write access for Hocuspocus collaboration sessions.
- Removed anonymous file view allowance from the backend security rules.
- Added JWT secret length validation and safer default actuator health detail exposure.

### Fixed

- Fixed PostgreSQL-compatible Flyway constraint creation.
- Fixed `/api/v1/auth/me` to read the authenticated user id from `UserDetailsImpl`.
- Fixed JWT blacklist checks to avoid Redis lookups for missing tokens.
- Fixed frontend API page handling for Spring Page responses.

### Changed

- Added CI gates for backend checks, frontend lint/build/audit, Hocuspocus syntax/audit, Compose validation, CodeQL, and Dependabot.
- Added production Compose and Kubernetes baseline manifests.
