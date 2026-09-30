import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.TRAMA_SMOKE_URL || 'http://127.0.0.1:58811';
const output = process.env.TRAMA_SMOKE_OUTPUT || 'artifacts/ui-audit-2026-09-29/release-local';
await mkdir(output, { recursive: true });
const response = await fetch(`${base}/api/v1/workspaces`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'QA de release descartável', seed: 'examples' })
});
assert.equal(response.status, 201);
const { workspace } = await response.json();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    const blockedAnalytics = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const message = m.text();
      // Cloudflare injects analytics at the edge. The editor/share CSP
      // intentionally rejects this third-party script; do not relax it.
      if (message.includes('https://static.cloudflareinsights.com/beacon.min.js') && message.includes('Content Security Policy')) blockedAnalytics.push(message);
      else errors.push(message);
    });
    const audit = async state => {
      await page.waitForTimeout(500);
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      assert.equal(dimensions.document, dimensions.viewport, `${state} overflow at ${width}`);
      const axe = await new AxeBuilder({ page }).analyze();
      const violations = axe.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, targets: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
      await page.screenshot({ path: `${output}/${state}-${width}.png`, animations: 'disabled' });
      results.push({ state, width, ...dimensions, violations, errors: [...errors], blockedAnalytics: [...blockedAnalytics] });
      assert.deepEqual(violations, [], `${state} axe at ${width}: ${JSON.stringify(violations)}`);
      assert.deepEqual(errors, [], `${state} console at ${width}`);
    };
    await page.goto(workspace.edit_url, { waitUntil: 'networkidle' });
    if (await page.getByRole('button', { name: 'Entendi', exact: true }).isVisible()) await page.getByRole('button', { name: 'Entendi', exact: true }).click();
    await page.locator('#workspace-map-list').waitFor();
    await audit('workspace');
    const titleHeight = await page.locator('.projects-map-card .ui-button-label > strong').first().evaluate(el => el.getBoundingClientRect().height);
    assert.ok(titleHeight > 18, 'Map title must remain visible');
    await page.getByRole('button', { name: 'Compartilhar', exact: true }).click();
    await page.locator('.trama-share-dialog[open]').waitFor();
    await page.addStyleTag({ content: '.trama-share-dialog input { filter: blur(10px) !important; }' });
    await audit('share-dialog');
    await page.keyboard.press('Escape');
    await page.locator('#workspace-map-list .projects-map-card').first().click();
    for (const mode of ['map', 'story', 'present']) {
      await page.locator(`[data-react-ui-mode='${mode}']`).click();
      await page.waitForFunction(m => document.body.dataset.uiMode === m, mode);
      await audit(mode);
    }
    await page.goto(workspace.share_url, { waitUntil: 'networkidle' });
    await audit('public-share');
    await page.getByRole('button', { name: 'Fechar painel', exact: true }).click();
    await audit('public-map');
    await context.close();
  }
} finally {
  await browser.close();
  const cleanup = await fetch(`${base}/api/v1/workspace?confirm=delete`, { method: 'DELETE', headers: { Authorization: `Bearer ${workspace.edit_token}` } });
  await writeFile(`${output}/manifest.json`, JSON.stringify({ base, checkedAt: new Date().toISOString(), results, cleanupStatus: cleanup.status }, null, 2));
  assert.equal(cleanup.status, 200);
}
console.log(JSON.stringify({ states: results.length, result: 'PASS', disposableWorkspaceDeleted: true }));
