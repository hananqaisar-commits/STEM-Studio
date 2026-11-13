import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envCandidates = [
  process.env.VITE_API_BASE_URL,
  ...['.env.production.local', '.env.production', '.env.local', '.env'].map((name) => {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) return undefined;
    const line = readFileSync(path, 'utf8').split(/\r?\n/).find((item) => /^\s*VITE_API_BASE_URL\s*=/.test(item));
    if (!line) return undefined;
    return line.replace(/^\s*VITE_API_BASE_URL\s*=\s*/, '').replace(/\s+#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
  }),
].find((value) => typeof value === 'string' && value.length > 0);

if (!envCandidates) {
  console.error('Android build needs VITE_API_BASE_URL. Copy .env.android.example to .env.production.local and set your deployed HTTPS API origin.');
  process.exit(1);
}

try {
  const apiUrl = new URL(envCandidates);
  if (apiUrl.protocol !== 'https:' || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash || apiUrl.hostname.endsWith('.example')) {
    throw new Error('Use a real HTTPS API origin with no path, query, or placeholder domain.');
  }
} catch (error) {
  console.error(`Invalid VITE_API_BASE_URL: ${error instanceof Error ? error.message : 'expected an HTTPS API origin.'}`);
  process.exit(1);
}
