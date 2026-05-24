# Security Policy

Memorica handles collaborative documents, authentication tokens, uploaded files, and audit data. Please treat security issues with care.

## Supported Versions

Security fixes are accepted for the `main` branch until formal release branches are created.

## Reporting a Vulnerability

Do not open a public issue for suspected vulnerabilities. Please send a private report to the project maintainers with:

- A short description of the issue.
- Affected component: backend, frontend, Hocuspocus, Docker, Kubernetes, or CI.
- Reproduction steps or proof of concept.
- Expected impact and any known mitigations.

If a private security advisory workflow is available in the repository, use it. Otherwise contact the maintainers through the repository owner profile.

## Security Baseline

- JWT secrets must be at least 32 bytes and must never use development defaults in production.
- Database migrations must be validated against PostgreSQL before deployment.
- Document read/write checks must be enforced consistently across REST, collaboration WebSocket, file access, and version history.
- Production deployments must inject secrets through environment-specific secret management.
- Dependency and code scanning should remain enabled for every pull request.
