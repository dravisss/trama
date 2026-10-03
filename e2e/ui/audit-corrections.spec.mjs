import { test, expect, qaBaseURL } from "../support/qa-test.mjs";
import AxeBuilder from "@axe-core/playwright";

async function openMap(page, width=1440, height=900) {
  await page.setViewportSize({width,height});
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto(`${qaBaseURL()}/?qa=1`);
  await page.getByRole("button",{name:/Flagship — Crescimento sob pressão/}).click();
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-camera-stable",/^map:stable:/);
}
async function panel(page, name) {
  if (await page.getByLabel("Painel do editor",{exact:true}).isVisible()) await page.getByLabel("Painel do editor",{exact:true}).selectOption(name);
  else await page.locator(`[data-dock-panel="${name}"]`).click();
}
async function cameraInside(page) {
  await expect.poll(()=>page.evaluate(()=>{
    const cy=window.tramaDemo.engine.cy, safe=JSON.parse(document.querySelector("#cld-root").dataset.qaSafeRect);
    const b=cy.elements(":visible").boundingBox({includeLabels:true}),z=cy.zoom(),p=cy.pan();
    return b.x1*z+p.x>=safe.x-2 && b.y1*z+p.y>=safe.y-2 && b.x2*z+p.x<=safe.x+safe.width+2 && b.y2*z+p.y<=safe.y+safe.height+2;
  })).toBe(true);
}
for (const width of [320,375,390,430,768,1024,1440]) {
 test(`audit: canvas and narrative at ${width}px`,async({page})=>{
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await openMap(page,width,width>=768?768:844);
  await cameraInside(page);
  await expect(page.locator("#toast")).toBeHidden();
  if(width<=720) await page.locator("#sidebar-toggle").click();
  await panel(page,"inspect");
  if(width<=1100){
    const picker=page.getByLabel("Painel do editor",{exact:true});
    expect((await picker.boundingBox()).width).toBeGreaterThan(150);
    await expect(page.locator(".utility-rail button[aria-current]")).toBeHidden();
  }
  await page.evaluate(()=>{const cy=window.tramaDemo.engine.cy;cy.elements().unselect();cy.getElementById("demand").select();});
  await expect(page.locator("#dock-node-fields")).toBeVisible();
  await expect(page.locator(".editor-inspector-empty")).toBeHidden();
  await page.locator("#dock-node-font-size").scrollIntoViewIfNeeded();
  await expect(page.locator("#dock-node-font-size")).toBeInViewport();
  await page.evaluate(()=>{const cy=window.tramaDemo.engine.cy;cy.elements().unselect();cy.getElementById("demand-planning").select();});
  await expect(page.locator("#dock-edge-fields")).toBeVisible();
  await expect(page.locator("#dock-node-fields")).toBeHidden();
  await expect(page.locator(".utility-rail [aria-current='page']")).toHaveCount(1);
  await page.locator("#close-editor-dock").click();
  await page.locator("[data-react-ui-mode='story']").click();
  await expect(page.locator("#story-timeline-shell")).toBeVisible();
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-camera-stable", /^story:stable:/);
  await cameraInside(page);
  if(width>720){
    const shell=await page.locator("#story-timeline-shell").boundingBox();
    const card=await page.locator(".story-timeline-card").first().boundingBox();
    expect(card.y+card.height).toBeLessThanOrEqual(shell.y+shell.height);
  }
  if(width<=720) await page.locator("button[data-story-surface='movement']").click();
  else if(width<=1100) await page.locator("#story-mobile-inspector-toggle").click();
  await expect(page.locator("#story-inspector-narration")).toBeVisible();
  await page.locator("#story-inspector-narration").fill("Uma narração completa para verificar o formulário e sua persistência.");
  await page.locator("#story-inspector-narration").blur();
  const last=page.locator("#story-inspector-clear-focus");
  if(await last.isVisible()) {await last.scrollIntoViewIfNeeded();await expect(last).toBeInViewport();}
  if(width<=1100) await page.locator("#story-mobile-inspector-close").click();
  await page.locator("[data-react-ui-mode='present']").click();
  await expect(page.locator("#presentation-card")).toBeVisible();
  const clipped=await page.locator("#presentation-body").evaluate(el=>el.scrollHeight>el.clientHeight+1);
  expect(clipped).toBe(false);
  expect(errors).toEqual([]);
 });
}
test("audit: invalid sources preserve graph and prevent applying",async({page})=>{
 await openMap(page);await panel(page,"code");
 const before=await page.evaluate(()=>window.tramaDemo.engine.model.nodes.map(n=>n.id));
 await page.locator("#loop-source-editor").fill("not a causal map");
 await expect(page.locator("#apply-loop-source")).toBeDisabled();
 await page.locator("#preview-loop-source").click();
 await expect(page.locator("#loop-source-status")).toContainText("último mapa válido");
 expect(await page.evaluate(()=>window.tramaDemo.engine.model.nodes.map(n=>n.id))).toEqual(before);
 await page.locator("#discard-loop-source").click();
 await expect(page.locator("#apply-loop-source")).toBeEnabled();
 await panel(page,"style");
 await page.locator("#loop-style-editor").fill("invalid syntax");
 await expect(page.locator("#apply-loop-style")).toBeDisabled();
 await expect(page.locator("#loop-style-status")).toContainText("Sintaxe de estilo não reconhecida");
 await expect(page.locator("#loop-style-editor")).toHaveValue("invalid syntax");
 expect(await page.evaluate(()=>window.tramaDemo.engine.model.nodes.map(n=>n.id))).toEqual(before);
});
test("audit: camera follows resize until a deliberate gesture",async({page,isMobile})=>{
 await openMap(page);await cameraInside(page);
 await page.setViewportSize({width:1024,height:768});await cameraInside(page);
 await page.locator("#close-editor-dock").click();await cameraInside(page);
 await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-camera-stable",/^map:stable:/);
 const box=await page.locator("#cld-root").boundingBox();
 const previousZoom=await page.evaluate(()=>window.tramaDemo.engine.cy.zoom());
 if(isMobile) await page.getByRole("button",{name:"Aumentar zoom",exact:true}).click();
 else {await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-250);}
 await expect.poll(()=>page.evaluate(()=>window.tramaDemo.engine.cy.zoom())).not.toBe(previousZoom);
 let lastZoom, stableSamples=0;
 await expect.poll(async()=>{const z=await page.evaluate(()=>window.tramaDemo.engine.cy.zoom());stableSamples=z===lastZoom?stableSamples+1:0;lastZoom=z;return stableSamples;},{intervals:[100]}).toBeGreaterThanOrEqual(5);
 const snapshot=await page.evaluate(()=>({zoom:window.tramaDemo.engine.cy.zoom(),pan:window.tramaDemo.engine.cy.pan()}));
 await page.setViewportSize({width:1100,height:780});
 await expect.poll(()=>page.evaluate(()=>window.tramaDemo.engine.cy.zoom())).toBe(snapshot.zoom);
 await page.locator("#fit").click();await cameraInside(page);
});
test("audit: focus, save feedback, notes, keyboard dialogs",async({page})=>{
 await openMap(page);
 await page.locator("#save-status").click();await expect(page.locator("#retry-save")).toBeHidden();await page.keyboard.press("Escape");
 await page.locator("#focus-toggle").click();
 const area=await page.locator("#cld-root").boundingBox();expect(area.width*area.height/(1440*900)).toBeGreaterThan(.85);
 await expect(page.locator(".react-app-navigation")).toBeHidden();await page.locator("#focus-exit").click();
 await page.locator("[data-react-ui-mode='story']").click();await page.locator("#story-v2-more-actions").click();
 await page.locator("#delete-presentation").click();await expect(page.locator("#command-dialog[open]")).toBeVisible();
 await expect(page.locator("#command-dialog-description")).toContainText("mapa será preservado");
 await page.keyboard.press("Escape");await expect(page.locator("#command-dialog")).toBeHidden();
 await page.locator("#story-v2-more-actions").click();await page.locator("#validate-presentation").click();
 await expect(page.locator("#story-lint-status")).not.toHaveText("Nenhuma validação executada.");
 await page.locator("[data-react-ui-mode='present']").click();await page.keyboard.press("p");
 await expect(page.locator("#presentation-presenter-panel")).toBeVisible();
});
test("audit: editor and story accessible surfaces",async({page})=>{
 await openMap(page);
 for(const mode of ["map","story"]){
  if(mode!=="map")await page.locator(`[data-react-ui-mode='${mode}']`).click();
  const results=await new AxeBuilder({page}).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter(v=>["critical","serious"].includes(v.impact))).toEqual([]);
 }
});
test('audit: network recovery retries the write and invalid backup preserves the project',async({page})=>{
 await openMap(page);await panel(page,'inspect');
 await page.evaluate(()=>{window.tramaDemo.engine.cy.getElementById('demand').select();});
 const before=await page.evaluate(()=>window.tramaDemo.engine.model.nodes.length);
 await page.route('**/api/**',route=>route.request().method()==='PUT'&&/\/api\/(maps|loops)\//.test(route.request().url())?route.abort('internetdisconnected'):route.continue());
 await page.locator('#dock-element-label').fill('Demanda após recuperação');
 await page.locator('#dock-inspector-form').evaluate(form=>form.requestSubmit());
 await expect(page.locator('#save-status')).toContainText(/offline/);
 await page.locator('#save-status').click();await expect(page.locator('#retry-save')).toBeVisible();
 await expect(page.locator('#save-popover-message')).toContainText('ainda não foram salvas');
 await page.keyboard.press('Escape');
 await page.locator('#dock-element-label').fill('Demanda após a segunda alteração offline');
 await page.locator('#dock-inspector-form').evaluate(form=>form.requestSubmit());
 await expect(page.locator('#save-status')).toContainText(/offline/);
 await page.locator('#save-status').click();await expect(page.locator('#retry-save')).toBeVisible();
 await page.unroute('**/api/**');
 await page.locator('#retry-save').click();await expect(page.locator('#save-status')).toHaveText('Salvo');
 await expect(page.locator('#retry-save')).toBeHidden();await page.keyboard.press('Escape');
 await page.locator('#project-backup-file').setInputFiles({name:'corrupt.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});
 await expect(page.locator('#toast')).toContainText('não é um backup Trama válido');
 expect(await page.evaluate(()=>window.tramaDemo.engine.model.nodes.length)).toBe(before);
 await page.reload();await page.getByRole('button',{name:/Flagship — Crescimento sob pressão/}).click();
 await page.evaluate(()=>{window.tramaDemo.engine.cy.getElementById('demand').select();});
 await expect(page.locator('#dock-element-label')).toHaveValue('Demanda após a segunda alteração offline');
});
