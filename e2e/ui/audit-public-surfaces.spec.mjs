import { exportOffline } from "../support/export-offline.mjs";
import { test, expect } from '@playwright/test';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadHostedConfig } from '../../server/hosted/config.js';
import { createHostedApp } from '../../server/hosted/app.js';
import { createStandaloneHtml } from '../../src/export/standalone.js';
import { buildUnifiedUiFixture } from '../../qa/fixtures/unified-ui-fixture.js';
let runtime;
test.beforeAll(async()=>{
 const root=resolve('.'),dataRoot=await mkdtemp(resolve(tmpdir(),'trama-public-audit-'));
 const config=loadHostedConfig({PORT:'0',HOST:'127.0.0.1',TRAMA_DATA_ROOT:dataRoot,TRAMA_PUBLIC_URL:'http://127.0.0.1'},{root});
 const app=createHostedApp(config);await new Promise(done=>app.server.listen(0,'127.0.0.1',done));
 const base=`http://127.0.0.1:${app.server.address().port}`;config.publicUrl=base;
 runtime={base,async stop(){await app.close();await rm(dataRoot,{recursive:true,force:true});}};
});
test.afterAll(async()=>runtime?.stop());
test('audit: secret masking, modal scroll, public canvas and revoked links',async({page,request})=>{
 const response=await request.post(`${runtime.base}/api/v1/workspaces`,{data:{title:'Audit public'}});
 const ws=(await response.json()).workspace;
 for(const viewport of [{width:1440,height:768},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.goto(ws.edit_url);
  if(await page.locator('.trama-notice button.trama-secondary').isVisible()) await page.locator('.trama-notice button.trama-secondary').click();
  await page.locator('.trama-share-trigger').click();
  const dialog=page.locator('.trama-share-dialog');await expect(dialog).toBeVisible();
  const secrets=dialog.locator('input[type=password]');await expect(secrets).toHaveCount(3);
  await dialog.getByRole('button',{name:'Revelar',exact:true}).first().click();
  await expect(dialog.getByRole('button',{name:'Ocultar',exact:true})).toHaveAttribute('aria-pressed','true');
  await dialog.getByRole('button',{name:'Ocultar',exact:true}).click();await expect(secrets).toHaveCount(3);
  const backup=dialog.getByRole('button',{name:/Baixar backup/});await backup.scrollIntoViewIfNeeded();await expect(backup).toBeInViewport();
  const title=dialog.locator('h2');await expect(title).toBeInViewport();
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
 }
 await page.goto(ws.share_url);await expect(page.locator('#standalone-graph')).toBeInViewport();
 await expect(page.locator('.standalone-empty')).toBeVisible();
 await expect(page.locator('.standalone-sidebar')).toBeHidden();
 await page.locator('[data-action=toggle-sidebar]').first().click();
 await expect(page.locator('.standalone-sidebar')).toContainText('ainda não possui relações');
 await expect(page.locator('.standalone-sidebar')).not.toContainText('Clique em uma aresta');
 const source=await readFile('tests/hosted/fixtures/capitalismo.loop.md','utf8');
 const saved=await request.post(`${runtime.base}/api/v1/maps`,{headers:{Authorization:`Bearer ${ws.edit_token}`},data:{markdown:source}});expect(saved.ok()).toBe(true);
 await page.goto(ws.share_url);await expect(page.locator('#standalone-graph')).toBeInViewport();
 const rotate=await request.post(`${runtime.base}/w/${ws.edit_token}/api/hosted/share/rotate`);expect(rotate.ok()).toBe(true);
 const revoked=await request.get(ws.share_url);expect(revoked.status()).toBe(404);
 const invalid=await request.get(`${runtime.base}/w/${'x'.repeat(32)}`);expect(invalid.status()).toBe(404);
});
test('audit: guided export opens narrative above fold offline',async({page,context,browserName})=>{
 const fixture=buildUnifiedUiFixture();const dir=await mkdtemp(resolve(tmpdir(),'trama-guided-audit-'));
 try{
  const path=resolve(dir,'guided.html');const loops=fixture.maps.map(map=>({...map,view:fixture.views.find(view=>view.map_id===map.id)}));
  const runtime=await readFile('dist/standalone-runtime.iife.js','utf8');
  const styles=(await Promise.all(['dist/standalone-fonts.css','standalone.css'].map(path=>readFile(path,'utf8')))).join('\n');
  await writeFile(path,createStandaloneHtml({project:fixture.project,model:loops.at(-1).model,loops,activeLoopId:loops.at(-1).id,presentation:fixture.presentations[0].presentation,presentations:fixture.presentations,assets:fixture.assets.map(asset=>({...asset,data_url:`data:${asset.mime_type};base64,${asset.content_base64}`})),runtime,styles,embed:{sidebar:true,presentationOnly:true}}));
  await exportOffline(context,true,browserName);await page.setViewportSize({width:1440,height:900});await page.goto(pathToFileURL(path).href);
  await expect(page.locator('.standalone-story')).toBeVisible();
  await expect(page.locator('.standalone-story')).toBeInViewport({ratio:1});
  await expect(page.locator('#standalone-graph')).toBeInViewport();
  await expect(page.locator('.standalone-story')).toHaveAttribute('data-camera-mode','fit-focus');
  await expect.poll(()=>page.locator('.cld-canvas').evaluate(canvas=>{
   const cy=canvas._cyreg?.cy;if(!cy||cy.animated())return false;
   const b=cy.elements(':visible').renderedBoundingBox({includeLabels:true});
   return b.x1>=0&&b.y1>=0&&b.x2<=canvas.clientWidth&&b.y2<=canvas.clientHeight;
  })).toBe(true);
  const openingZoom=await page.locator('.cld-canvas').evaluate(canvas=>canvas._cyreg.cy.zoom());
  await page.locator('[data-story="next"]').click();
  await expect(page.locator('.standalone-story h2')).toHaveText('A pergunta-guia');
  await expect(page.locator('.standalone-story')).toHaveAttribute('data-camera-mode','fit-focus');
  await expect.poll(()=>page.locator('.cld-canvas').evaluate(canvas=>canvas._cyreg.cy.zoom())).toBeGreaterThan(openingZoom);
  await expect(page.locator('.standalone-shell')).not.toContainText('type: reinforcing');
  await expect(page.locator('.standalone-shell')).not.toContainText('type: balancing');
 }finally{await exportOffline(context,false,browserName);await rm(dir,{recursive:true,force:true});}
});
test('audit: landing retains semantic spaces at every mobile width',async({page})=>{
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:844});await page.goto(runtime.base);
  const headings=await page.locator('h1,h2').allTextContents();
  expect(headings.join(' ')).not.toMatch(/começaentre|efeitoVolta|tudo\.Conduza/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.setViewportSize({width:1440,height:900});
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(runtime.base);
 await expect(page.locator('#next')).toBeEnabled();
 await expect(page.locator('.journey')).toHaveClass(/is-cinematic/);
 await page.evaluate(()=>{const root=document.querySelector('.journey'),span=root.offsetHeight-root.firstElementChild.offsetHeight;window.scrollTo({top:scrollY+root.getBoundingClientRect().top+span*.45,behavior:'instant'});});
 await expect(page.locator('#step-number')).toHaveText('3');
 await page.locator('#next').click();await expect(page.locator('#step-number')).toHaveText('4');
 await expect(page.locator('#scroll-follow')).toHaveAttribute('data-paused','true');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(runtime.base);
 await expect(page.locator('#next')).toBeEnabled();
 await expect(page.locator('.journey')).not.toHaveClass(/is-cinematic/);
 await page.locator('[data-story-enter]').click();
 await expect(page.locator('.demo-tabs button[data-mode="story"]')).toBeFocused();
 await page.locator('#next').click();await expect(page.locator('#step-number')).toHaveText('2');
});
