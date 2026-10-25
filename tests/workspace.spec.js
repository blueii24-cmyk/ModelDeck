import { test, expect } from '@playwright/test';
test('welcome, prompts, connections, theme and persisted history', async ({page}) => {
 const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:"What’s on your mind?"})).toBeVisible();
 await expect(page.locator('.top .rich-model-picker')).toHaveCount(0);
 await expect(page.locator('.composer-actions .rich-model-picker')).toBeVisible();
 await page.getByRole('button',{name:'Model playground'}).click();
 await expect(page.getByRole('heading',{name:'Your AI space.'})).toBeVisible();
 await page.getByRole('button',{name:'Open chat'}).click();
 await page.getByRole('button',{name:'Build something'}).click();
 await expect(page.getByRole('textbox',{name:'Message ModelDeck'})).toHaveValue(/Help me build/);
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.locator('#apiKey')).toHaveAttribute('type','password');
 await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.locator('#appearance').click();
 await page.getByRole('button',{name:'Dark Dim and focused'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-mode','dark');
 await page.getByRole('button',{name:'Light Bright and clear'}).click();
 await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.locator('#newChat').click();
 await expect(page.locator('#history button')).toHaveCount(1);
 await page.reload();
 await expect(page.locator('#history button')).toHaveCount(1);
 await page.screenshot({path:'test-results/desktop.png'});
 expect(errors).toEqual([]);
});
test('mobile drawer, quick start and no horizontal overflow', async ({page})=>{
 await page.setViewportSize({width:390,height:844}); await page.goto('/');
 await page.getByRole('button',{name:'Open navigation'}).click();
 await expect(page.locator('#side')).toHaveClass(/open/);
 await page.locator('#newChat').click();
 await expect(page.locator('#side')).not.toHaveClass(/open/);
 await page.getByRole('button',{name:'Quick start'}).click();
 await expect(page.getByText('Ready, player one?')).toBeVisible();
 await page.getByRole('button',{name:'Quick start'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'test-results/mobile.png'});
});
test('mock provider request renders and saves an answer',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('modeldeck-ghpages-v2',JSON.stringify({connections:[{id:'test',name:'Test',provider:'openai',apiKey:'test-only',baseUrl:'https://api.openai.com/v1',model:'gpt-4o-mini',availableModels:[]}],selectedConnectionId:'test',chats:[]})));
 await page.route('https://api.openai.com/v1/chat/completions', route=>route.fulfill({json:{choices:[{message:{content:'Hello from the test model.'}}]}}));
 await page.goto('/'); await page.locator('#prompt').fill('Hello'); await page.locator('#send').click();
 await expect(page.locator('.message.assistant')).toHaveText('Hello from the test model.');
 await expect(page.locator('#welcome')).toBeHidden();
 await expect(page.locator('#history button')).toHaveText('Hello');
});


test('compact composer model selector fits narrow Android viewports', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const picker = page.locator('.composer-actions .rich-model-picker');
  const trigger = picker.getByRole('button', { name: 'Switch model', exact: true });
  const send = page.getByRole('button', { name: 'Send message' });
  await expect(picker).toBeVisible();
  await expect(trigger).toBeVisible();
  await expect(send).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const triggerBox = await trigger.boundingBox();
  const sendBox = await send.boundingBox();
  expect(triggerBox).not.toBeNull();
  expect(sendBox).not.toBeNull();
  expect(triggerBox.x + triggerBox.width).toBeLessThanOrEqual(sendBox.x + 1);
  await trigger.click();
  await expect(page.getByRole('listbox', { name: 'Saved models' })).toBeVisible();
  const popupBox = await page.locator('.composer-model-picker .model-picker-popup').boundingBox();
  expect(popupBox).not.toBeNull();
  expect(popupBox.x).toBeGreaterThanOrEqual(0);
  expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(360);
});


test('desktop chat and composer use the available width', async ({ page }) => {
  await page.setViewportSize({ width: 1769, height: 840 });
  await page.goto('/');
  const main = await page.locator('main.main').boundingBox();
  const chat = await page.locator('#chat').boundingBox();
  const messages = await page.locator('.messages').boundingBox();
  const composer = await page.locator('.composer-wrap').boundingBox();
  expect(main).not.toBeNull();
  expect(chat).not.toBeNull();
  expect(messages).not.toBeNull();
  expect(composer).not.toBeNull();
  expect(chat.width).toBeGreaterThan(main.width * 0.9);
  expect(composer.width).toBeGreaterThan(main.width * 0.9);
  expect(messages.width).toBeGreaterThan(main.width * 0.65);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
