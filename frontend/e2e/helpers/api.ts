import { expect, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8080/api/v1';
const HEALTH_URL = process.env.E2E_BACKEND_HEALTH_URL || 'http://127.0.0.1:8080/actuator/health';
const TEST_PASSWORD = 'Password1';
const USERNAME_MAX_LENGTH = 32;
const USERNAME_FALLBACK_PREFIX = 'e2e';

export interface TestAuth {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    email: string;
  };
}

export function uniqueName(prefix: string) {
  const suffix = `${Date.now().toString(36).slice(-6)}_${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}`;
  const maxPrefixLength = USERNAME_MAX_LENGTH - suffix.length - 1;
  const normalizedPrefix = prefix
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safePrefix = (normalizedPrefix || USERNAME_FALLBACK_PREFIX).slice(0, maxPrefixLength).replace(/[_-]+$/g, '');

  return `${safePrefix || USERNAME_FALLBACK_PREFIX}_${suffix}`;
}

async function expectOk(response: Awaited<ReturnType<APIRequestContext['get']>>, message: string) {
  expect(response.ok(), `${message}: ${response.status()} ${await response.text()}`).toBeTruthy();
}

export async function expectBackendReady(request: APIRequestContext) {
  const response = await request.get(HEALTH_URL, { timeout: 5_000 }).catch(() => null);
  expect(response?.ok(), `Backend is not ready at ${HEALTH_URL}`).toBeTruthy();
}

export async function registerTestUser(request: APIRequestContext, prefix: string): Promise<TestAuth> {
  const username = uniqueName(prefix).toLowerCase();
  const response = await request.post(`${API_BASE}/auth/register`, {
    data: {
      username,
      password: TEST_PASSWORD,
      email: `${username}@example.test`,
    },
  });
  await expectOk(response, 'Register test user');
  return (await response.json()).data as TestAuth;
}

export async function loginByStorage(page: Page, auth: TestAuth) {
  await page.addInitScript(({ accessToken, refreshToken }) => {
    window.localStorage.setItem('accessToken', accessToken);
    window.localStorage.setItem('refreshToken', refreshToken);
  }, auth);
}

export async function createDocument(request: APIRequestContext, auth: TestAuth, title: string) {
  const response = await request.post(`${API_BASE}/documents`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { title },
  });
  await expectOk(response, 'Create document');
  return (await response.json()).data as { id: string; title: string; canWrite: boolean; canManage: boolean };
}

export async function grantDocumentAccess(
  request: APIRequestContext,
  auth: TestAuth,
  documentId: string,
  username: string,
  role: 'viewer' | 'editor'
) {
  const response = await request.post(`${API_BASE}/documents/${documentId}/sharing/members`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { username, role },
  });
  await expectOk(response, 'Grant document access');
  return (await response.json()).data;
}

export async function getDocument(request: APIRequestContext, auth: TestAuth, documentId: string) {
  const response = await request.get(`${API_BASE}/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  await expectOk(response, 'Get document');
  return (await response.json()).data as { id: string; canWrite: boolean; canManage: boolean };
}

export async function listVersions(request: APIRequestContext, auth: TestAuth, documentId: string) {
  const response = await request.get(`${API_BASE}/documents/${documentId}/versions`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  await expectOk(response, 'List versions');
  return ((await response.json()).data.content || []) as Array<{ id: number; versionNumber: number }>;
}

export async function getVersion(request: APIRequestContext, auth: TestAuth, versionId: number) {
  const response = await request.get(`${API_BASE}/documents/versions/${versionId}`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  await expectOk(response, 'Get version');
  return (await response.json()).data as { contentJson: string; snapshotHtml?: string };
}

export async function getLatestVersionContent(request: APIRequestContext, auth: TestAuth, documentId: string) {
  const versions = await listVersions(request, auth, documentId);
  if (versions.length === 0) return '';
  const latest = await getVersion(request, auth, versions[0].id);
  return latest.contentJson;
}

export async function expectLatestVersionContains(
  request: APIRequestContext,
  auth: TestAuth,
  documentId: string,
  expected: string
) {
  await expect
    .poll(
      async () => {
        const versions = await listVersions(request, auth, documentId);
        if (versions.length === 0) return '';
        const latest = await getVersion(request, auth, versions[0].id);
        return latest.contentJson;
      },
      { timeout: 12_000, intervals: [500, 1_000, 2_000] }
    )
    .toContain(expected);
}

export async function expectLatestVersionNotContains(
  request: APIRequestContext,
  auth: TestAuth,
  documentId: string,
  unexpected: string
) {
  await expect
    .poll(
      async () => getLatestVersionContent(request, auth, documentId),
      { timeout: 12_000, intervals: [500, 1_000, 2_000] }
    )
    .not.toContain(unexpected);
}

export async function generateAI(request: APIRequestContext, auth: TestAuth, documentId: string, text: string) {
  const response = await request.post(`${API_BASE}/ai/generate`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { documentId, action: 'summarize', text },
  });
  await expectOk(response, 'Generate AI response');
  return (await response.json()).data as { provider: string; model: string; text: string };
}

export async function getFileInfo(request: APIRequestContext, auth: TestAuth, objectName: string) {
  const response = await request.get(`${API_BASE}/files/view/${encodeURIComponent(objectName)}`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  await expectOk(response, 'Get file URL');
  return (await response.json()).data as { objectName: string; url: string; originalName: string };
}
