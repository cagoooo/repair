import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = join(rootDir, 'package.json');
const serviceWorkerPath = join(rootDir, 'public', 'sw.js');
const versionPath = join(rootDir, 'public', 'version.json');
const checkOnly = process.argv.includes('--check');

const packageVersion = JSON.parse(readFileSync(packagePath, 'utf8')).version;
const originalServiceWorker = readFileSync(serviceWorkerPath, 'utf8');
const syncedServiceWorker = originalServiceWorker.replace(
  /const BUILD_VERSION = '[^']+';/,
  `const BUILD_VERSION = '${packageVersion}';`
);

if (syncedServiceWorker === originalServiceWorker &&
    !originalServiceWorker.includes(`const BUILD_VERSION = '${packageVersion}';`)) {
  throw new Error('找不到 public/sw.js 的 BUILD_VERSION，無法同步 PWA 版本');
}

const versionPayload = `${JSON.stringify({
  version: packageVersion,
  notes: '新學期教室配置安全換版與 OCR 匯入'
}, null, 2)}\n`;
const currentVersionPayload = readFileSync(versionPath, 'utf8');

if (checkOnly) {
  const aligned = originalServiceWorker === syncedServiceWorker &&
    currentVersionPayload === versionPayload;
  if (!aligned) {
    console.error(`❌ PWA 版本未同步，package.json 目前為 ${packageVersion}`);
    process.exit(1);
  }
  console.log(`✓ PWA 版本一致：${packageVersion}`);
  process.exit(0);
}

if (originalServiceWorker !== syncedServiceWorker) {
  writeFileSync(serviceWorkerPath, syncedServiceWorker, 'utf8');
}
if (currentVersionPayload !== versionPayload) {
  writeFileSync(versionPath, versionPayload, 'utf8');
}

console.log(`✓ PWA 版本已同步：${packageVersion}`);
