/**
 * @module   backup
 * @purpose  File menu actions: manual portfolio snapshot (private/snapshots/,
 *           prefixed snapshot_ so it doesn't show up in Saved Scenarios),
 *           and a full backup bundle (portfolio + classification + profile +
 *           metrics + all saved snapshots + settings) exported/imported as
 *           one JSON file via the browser's own download/upload.
 * @exports  initBackup()
 * @reads    @js/store.js @js/toast.js
 * @usedby   @js/app.js
 */

import { getPortfolio, setPortfolio } from './store.js';
import { showToast } from './toast.js';

const BUNDLE_FILES = ['private/classification.md', 'private/profile.md', 'private/metrics.md', 'data/settings.md'];

async function saveSnapshot() {
  const portfolio = getPortfolio();
  if (!portfolio) {
    showToast('⚠️ Nothing to snapshot — import a portfolio first', 'error');
    return;
  }
  const name = `snapshot_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
  const res = await fetch('/api/snapshots', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content: portfolio }),
  });
  const result = await res.json();
  showToast(result.saved ? `✅ Saved snapshot ${name}` : `❌ ${result.error ?? 'save failed'}`, result.saved ? 'info' : 'error');
}

async function exportBackup() {
  const [files, snapshotList] = await Promise.all([
    Promise.all(BUNDLE_FILES.map((path) => fetch(`/api/files?path=${encodeURIComponent(path)}`).then((r) => r.json()).then((d) => [path, d.content]))),
    fetch('/api/snapshots').then((r) => r.json()),
  ]);
  const snapshots = await Promise.all(
    snapshotList.files.map((f) => fetch(`/api/snapshots?name=${encodeURIComponent(f.name)}`).then((r) => r.json()).then((d) => [f.name, d.content]))
  );

  const bundle = {
    exportedAt: new Date().toISOString(),
    portfolio: getPortfolio(),
    files: Object.fromEntries(files),
    snapshots: Object.fromEntries(snapshots),
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('✅ Backup downloaded');
}

async function importBackup(file) {
  let bundle;
  try {
    bundle = JSON.parse(await file.text());
  } catch {
    showToast('❌ Not a valid backup file', 'error');
    return;
  }
  if (!confirm(`This will overwrite your current portfolio, classification, profile notes, metrics, settings, and saved snapshots with the contents of "${file.name}" (exported ${bundle.exportedAt ?? 'unknown date'}). Continue?`)) {
    return;
  }

  if (bundle.portfolio) setPortfolio(bundle.portfolio, { importedAt: bundle.portfolio.importedAt });
  for (const [path, content] of Object.entries(bundle.files ?? {})) {
    await fetch('/api/files', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, content }) });
  }
  for (const [name, content] of Object.entries(bundle.snapshots ?? {})) {
    await fetch('/api/snapshots', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, content }) });
  }
  showToast('✅ Backup restored — reload the page to see every change');
}

export function initBackup() {
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.json';
  importInput.style.display = 'none';
  importInput.addEventListener('change', () => {
    if (importInput.files[0]) importBackup(importInput.files[0]);
    importInput.value = '';
  });
  document.body.appendChild(importInput);

  document.addEventListener('menu-action', (e) => {
    if (e.detail === 'save-snapshot') saveSnapshot();
    if (e.detail === 'export-backup') exportBackup();
    if (e.detail === 'import-backup') importInput.click();
  });
}
