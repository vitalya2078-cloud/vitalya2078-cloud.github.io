import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const manifestPath = join(dist, 'manifest.webmanifest');
const serviceWorkerPath = join(dist, 'sw.js');
const htmlPath = join(dist, 'index.html');

for (const path of [manifestPath, serviceWorkerPath, htmlPath]) {
  if (!existsSync(path)) {
    throw new Error(`Missing PWA build output: ${path}`);
  }
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.start_url !== '/physics-v2/' || manifest.scope !== '/physics-v2/') {
  throw new Error('PWA manifest start_url/scope must match the GitHub Pages base path.');
}
if (manifest.display !== 'standalone') {
  throw new Error('PWA manifest must use standalone display mode.');
}
if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
  throw new Error('PWA manifest must declare at least one app icon.');
}

for (const icon of manifest.icons) {
  const iconPath = join(dist, icon.src.replace(/^\.\//, ''));
  if (!existsSync(iconPath)) {
    throw new Error(`PWA icon file is missing: ${iconPath}`);
  }
}

const html = readFileSync(htmlPath, 'utf8');
if (!html.includes('manifest.webmanifest')) {
  throw new Error('Built index.html does not link the PWA manifest.');
}

const assetPaths = [
  ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
].map((match) => match[1]);

if (assetPaths.length === 0) {
  throw new Error('Built index.html does not reference JavaScript/CSS bundles.');
}

for (const asset of assetPaths) {
  const relativePath = asset.replace(/^\/physics-v2\//, '');
  if (!existsSync(join(dist, relativePath))) {
    throw new Error(`Built application asset is missing: ${asset}`);
  }
}

const serviceWorker = readFileSync(serviceWorkerPath, 'utf8');
for (const required of ['skipWaiting', 'clients.claim', 'manifest.webmanifest', 'icon.svg']) {
  if (!serviceWorker.includes(required)) {
    throw new Error(`Service worker is missing required offline behavior: ${required}`);
  }
}

console.log(`PWA smoke test passed: manifest, ${manifest.icons.length} icon(s), service worker and ${assetPaths.length} app asset(s).`);
