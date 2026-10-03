import base from './playwright.config.mjs';
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 ...base,
 testMatch: ['**/audit-*.spec.mjs', '**/atlas-embed-offline.spec.mjs', '**/a11y/*.spec.mjs'],
 projects: [
  ...['chromium','firefox','webkit'].map(browserName => ({name:browserName,use:{browserName,channel:undefined}})),
  {name:'iPhone emulado',testMatch:['**/audit-*.spec.mjs'],use:{...devices['iPhone 13'],browserName:'webkit',channel:undefined}},
  {name:'Android emulado',testMatch:['**/audit-*.spec.mjs'],use:{...devices['Pixel 5'],browserName:'chromium',channel:undefined}}
 ],
 outputDir: 'artifacts/audit-browser-matrix'
});
