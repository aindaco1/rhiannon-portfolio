import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const admin = 'http://127.0.0.1:4326';
const api = (page, path, method = 'GET', body) => page.evaluate(async ({path,method,body}) => {
  const response = await fetch('/api' + path, {method, headers:{'content-type':'application/json'}, ...(body ? {body:JSON.stringify(body)} : {})});
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}, {path,method,body});
async function restore(page, catalog) {
  const state = await api(page, '/state');
  const saved = await api(page, '/draft', 'PUT', {catalog,revision:state.revision,publishedRevision:state.publishedRevision});
  await api(page, '/publish', 'POST', {revision:saved.revision,publishedRevision:saved.publishedRevision});
}

for (const kind of ['tag', 'category']) test(`${kind}-only changes save and publish from Categories & tags`, async ({page}) => {
  await page.goto(admin + '/admin/');
  await expect(page.locator('h1')).toHaveText('Projects');
  const before = await api(page, '/state');
  try {
    await page.locator('[data-view="taxonomy"]').click();
    // Add still requires a name; empty creation is separate from saving the catalog.
    await page.getByRole('button', {name:`Add ${kind}`,exact:true}).click();
    expect(await page.getByLabel(`New ${kind}`,{exact:true}).evaluate(e => e.validity.valueMissing)).toBe(true);
    const label = `Independent ${kind}`;
    await page.getByLabel(`New ${kind}`,{exact:true}).fill(label);
    await page.getByRole('button', {name:`Add ${kind}`,exact:true}).click();
    await page.getByRole('button', {name:'Save draft',exact:true}).click();
    await expect(page.locator('#feedback')).toContainText('Draft saved');
    // Also exercise Publish's implicit save from this same view.
    await page.getByLabel(`${label} label`,{exact:true}).fill(label + ' updated');
    page.once('dialog',d => d.accept());
    await page.locator('#publish').click();
    await expect(page.locator('#feedback')).toContainText('Published to the local preview',{timeout:30000});
    const after = await api(page, '/state');
    const key = kind === 'tag' ? 'tags' : 'categories';
    expect(after.catalog[key].at(-1).label).toBe(label + ' updated');
    expect(after.catalog[kind === 'tag' ? 'categories' : 'tags']).toEqual(before.catalog[kind === 'tag' ? 'categories' : 'tags']);
    expect(after.revision).toBe(after.publishedRevision);
    await page.reload();
    await page.locator('[data-view="taxonomy"]').click();
    await expect(page.getByLabel(`${label} updated label`,{exact:true})).toBeVisible();
    await page.locator('[data-view="projects"]').click();
    await page.locator('.entry-link').first().click();
    await page.getByLabel('Title',{exact:true}).fill('');
    await page.locator('#save').click();
    await expect(page.locator('#feedback')).toHaveClass(/error/);
    expect((await api(page,'/state')).revision).toBe(after.revision);
  } finally {
    await restore(page, before.catalog);
  }
});

test('masonry galleries preserve image proportions and open a complete, scoped accessible viewer', async ({page, browser}) => {
  await page.goto(admin + '/admin/');
  await expect(page.locator('h1')).toHaveText('Projects');
  const before = await api(page, '/state');
  const catalog = structuredClone(before.catalog);
  const entry = catalog.entries.find(e => e.slug === 'red-study');
  const image = (name, caption) => ({src:`/assets/media/sample-${name}.jpg`,alt:`Gallery ${name}`,caption,decorative:false});
  const grid = {type:'gallery',layout:'grid',caption_style:'inline',align:'left',caption:'Mixed image proportions',images:[
    image('television','Landscape image'), image('red-study','Portrait image'), image('face-study','Another portrait'), image('red-veil','Final image'),
  ]};
  entry.blocks = [grid, {...grid,caption:'Separate gallery',images:[image('still-life','Only image')]}, {...grid,layout:'carousel',images:grid.images.slice(0,2)}];
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await restore(page,catalog);
    const preview = await api(page,'/preview','POST',{catalog,id:entry.id});
    expect(preview.html).toContain(`class="gallery-image" href="${grid.images[0].src}"`);
    const route = 'http://127.0.0.1:4325/work/red-study/';
    for (const width of [390,1440]) {
      await page.setViewportSize({width,height:950});
      await page.goto(route);
      const gallery = page.locator('.gallery-images').first();
      const links = gallery.locator('.gallery-image');
      await gallery.scrollIntoViewIfNeeded();
      await gallery.locator('img').evaluateAll(images => Promise.all(images.map(i => i.decode())));
      const geometry = await gallery.locator(':scope > figure').evaluateAll(figures => figures.map(f => {
        const rect=f.getBoundingClientRect(), img=f.querySelector('img'), ir=img.getBoundingClientRect();
        return {x:rect.x,y:rect.y,bottom:rect.bottom,ratio:ir.width/ir.height,naturalRatio:img.naturalWidth/img.naturalHeight};
      }));
      const columns = new Set(geometry.map(g => Math.round(g.x)));
      expect(columns.size).toBe(width === 390 ? 1 : 2);
      for (const item of geometry) expect(item.ratio).toBeCloseTo(item.naturalRatio,2);
      for (const x of columns) {
        const items=geometry.filter(g=>Math.round(g.x)===x).sort((a,b)=>a.y-b.y);
        for(let i=1;i<items.length;i++) expect(items[i].y-items[i-1].bottom).toBeLessThanOrEqual(19);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await links.nth(2).focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog',{name:'Image gallery'});
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('img')).toHaveAttribute('src',new URL(grid.images[2].src,route).href);
      await expect(dialog.getByRole('status')).toHaveText('3 / 4');
      await expect(dialog.getByRole('button',{name:'Close gallery'})).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(dialog.getByRole('button',{name:'Next image'})).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(dialog.getByRole('button',{name:'Close gallery'})).toBeFocused();
      for (const expected of [4,1,2,3]) {
        await dialog.getByRole('button',{name:'Next image'}).click();
        await expect(dialog.getByRole('status')).toHaveText(`${expected} / 4`);
        await expect(dialog.locator('img')).toHaveAttribute('src',new URL(grid.images[expected-1].src,route).href);
        await expect(dialog.locator('figcaption')).toHaveText(grid.images[expected-1].caption);
      }
      await page.keyboard.press('ArrowLeft');
      await expect(dialog.getByRole('status')).toHaveText('2 / 4');
      await page.keyboard.press('ArrowRight');
      await expect(dialog.getByRole('status')).toHaveText('3 / 4');
      const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      expect(result.violations).toEqual([]);
      await page.screenshot({path:`docs/evidence/gallery-task/modal-${width}.png`});
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(links.nth(2)).toBeFocused();
      await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
      await page.locator('.gallery-images').nth(1).locator('.gallery-image').click();
      await expect(dialog.getByRole('status')).toHaveText('1 / 1');
      await expect(dialog.getByRole('button',{name:'Next image'})).toBeHidden();
      await expect(dialog.getByRole('button',{name:'Previous image'})).toBeHidden();
      await dialog.getByRole('button',{name:'Close gallery'}).click();
      await expect(page.locator('.gallery-images').nth(1).locator('.gallery-image')).toBeFocused();
      const carousel=page.locator('.gallery--carousel .gallery-images');
      expect(await carousel.evaluate(e=>getComputedStyle(e).display)).toBe('flex');
      await carousel.locator('.gallery-image').first().click();
      await expect(dialog.getByRole('status')).toHaveText('1 / 2');
      await dialog.getByRole('button',{name:'Close gallery'}).click();
      await gallery.scrollIntoViewIfNeeded();
      await page.screenshot({path:`docs/evidence/gallery-task/masonry-${width}.png`});
    }
    const context=await browser.newContext({javaScriptEnabled:false});
    try {
      const fallback=await context.newPage();
      await fallback.goto(route);
      await fallback.locator('.gallery-image').first().click();
      await expect(fallback).toHaveURL(new URL(grid.images[0].src,route).href);
    } finally {await context.close();}
    expect(errors).toEqual([]);
  } finally {
    await page.goto(admin+'/admin/');
    await restore(page,before.catalog);
  }
});
