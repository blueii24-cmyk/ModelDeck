import { test, expect } from '@playwright/test';
import { extractWebsite, sandboxDocument } from '../src/preview-utils.js';

test('extracts explicit HTML and associated CSS/JS, not prose or JSX', () => {
 expect(extractWebsite('Just some text <strong>hello</strong>')).toBeNull();
 expect(extractWebsite('```jsx\nexport default () => <div/>;\n```')).toBeNull();
 const result=extractWebsite('```html\n<h1>Hello</h1>\n```\n```css\nh1{color:red}\n```\n```js\ndocument.title="Demo"\n```');
 expect(result).toContain('<h1>Hello</h1>'); expect(result).toContain('<style>'); expect(result).toContain('<script>');
 expect(extractWebsite('<!doctype html><html><body>Hello</body></html>')).toContain('Hello');
 expect(sandboxDocument('<h1>Hello</h1>')).toContain("connect-src 'none'");
});

async function seed(page) {
 await page.addInitScript(() => localStorage.setItem('modeldeck-ghpages-v2',JSON.stringify({chats:[{id:'website-test',title:'My website',provider:'openrouter',model:'openai/gpt-4o-mini',messages:[{role:'assistant',content:'Here is your website:\n```html\n<!doctype html><html><head><title>Demo</title></head><body><h1>Hello preview</h1><button onclick="this.textContent=\'Clicked!\'">Click me</button><script>try { parent.localStorage.getItem("modeldeck-ghpages-v2"); document.body.dataset.isolated="no"; } catch { document.body.dataset.isolated="yes"; } fetch("https://example.com/test").then(()=>document.body.dataset.network="allowed").catch(()=>document.body.dataset.network="blocked");</script></body></html>\n```'}]}]})));
 await page.goto('/');
 await page.getByRole('button',{name:'Preview website'}).click();
}

test('preview runs in isolation, edits, resizes, downloads, closes',async({page})=>{
 await seed(page);
 const frame=page.frameLocator('iframe[title="Generated website"]');
 await expect(frame.getByRole('heading',{name:'Hello preview'})).toBeVisible();
 await expect(frame.locator('body')).toHaveAttribute('data-isolated','yes');
 await expect(frame.locator('body')).toHaveAttribute('data-network','blocked');
 await frame.getByRole('button',{name:'Click me'}).click();
 await expect(frame.getByRole('button',{name:'Clicked!'})).toBeVisible();
 await page.getByRole('button',{name:'Mobile preview',exact:true}).click();
 await expect.poll(() => page.locator('iframe').evaluate(el=>el.getBoundingClientRect().width)).toBeLessThanOrEqual(375);
 await page.getByRole('button',{name:'Code',exact:true}).click();
 await page.getByRole('textbox',{name:'Website HTML code'}).fill('<h1>Edited website</h1>');
 await page.getByRole('button',{name:'Run edits'}).click();
 await expect(frame.getByRole('heading',{name:'Edited website'})).toBeVisible();
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download HTML'}).click();
 expect((await downloadPromise).suggestedFilename()).toBe('modeldeck-website.html');
 await page.getByRole('button',{name:'Close website preview'}).click();
 await expect(page.locator('iframe')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Preview website'})).toBeFocused();
});

test('mobile preview fits and conversation changes dismiss it',async({page})=>{
 await page.setViewportSize({width:390,height:844}); await seed(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await expect(page.getByRole('button',{name:'Close website preview'})).toBeVisible();
 await page.getByRole('button',{name:'Close website preview'}).click();
 await page.setViewportSize({width:1440,height:900});
 await page.getByRole('button',{name:'Preview website'}).click();
 await page.locator('#newChat').click();
 await expect(page.locator('iframe')).toHaveCount(0);
});


test('sandbox keeps web requests off by default and can opt in to website/game resources', () => {
  const offline = sandboxDocument('<h1>Offline</h1>', { channel: 'test-channel' });
  expect(offline).toContain("connect-src 'none'");
  expect(offline).toContain("worker-src blob: data:");
  expect(offline).toContain('modeldeck-preview-console');
  expect(offline).toContain('test-channel');

  const online = sandboxDocument('<h1>Online</h1>', {
    allowExternalResources: true,
    channel: 'web-channel',
  });
  expect(online).toContain('connect-src https: wss:');
  expect(online).toContain("script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https: data: blob:");
  expect(online).toContain('worker-src https: blob: data:');
});

test('preview console collects runtime messages and web-resource toggle reloads in isolation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('modeldeck-ghpages-v2', JSON.stringify({
    chats: [{
      id: 'console-preview',
      title: 'Console test',
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      messages: [{
        role: 'assistant',
        content: '<!doctype html><html><head><title>Console test</title></head><body><h1>Game canvas</h1><script>localStorage.setItem("modeldeck-test", "ready"); console.log("storage=" + localStorage.getItem("modeldeck-test")); console.log("hello game"); console.error("boom");</script></body></html>'
      }]
    }]
  })));
  await page.goto('/');
  await page.getByRole('button', { name: 'Preview website' }).click();
  await page.getByRole('tab', { name: 'Console' }).click();
  await expect(page.locator('.preview-console-row.log pre')).toContainText('hello game');
  await expect(page.locator('.preview-console-row.log pre')).toContainText('storage=ready');
  await expect(page.locator('.preview-console-row.error pre')).toContainText('boom');

  await page.getByRole('button', { name: 'Toggle web resources' }).click();
  await expect(page.getByRole('button', { name: 'Toggle web resources' })).toHaveAttribute('aria-pressed', 'true');
  const frame = page.frameLocator('iframe[title="Generated website"]');
  await expect(frame.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /connect-src https: wss:/);
  await page.getByRole('button', { name: 'Tablet preview' }).click();
  await expect(page.locator('.preview-canvas.tablet iframe')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fullscreen preview' })).toBeVisible();
});
