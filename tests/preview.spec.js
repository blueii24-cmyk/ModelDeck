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
 expect(await page.locator('iframe').evaluate(el=>el.getBoundingClientRect().width)).toBeLessThanOrEqual(375);
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
