import { test, expect } from '@playwright/test';

async function setup(page) {
  await page.addInitScript(() => localStorage.setItem('modeldeck-ghpages-v2', JSON.stringify({
    connections: [{id:'test',name:'Test',provider:'openai',apiKey:'test-only',baseUrl:'https://api.openai.com/v1',model:'gpt-4o-mini',availableModels:[]}],
    selectedConnectionId:'test', chats:[]
  })));
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('https://api.openai.com/v1/chat/completions', async route => {
    const response = await held;
    await route.fulfill(response);
  });
  await page.goto('/');
  await page.locator('#prompt').fill('Hello');
  await page.locator('#send').click();
  await expect(page.locator('.thinking-card')).toBeVisible();
  return release;
}
const success = { json: {choices:[{message:{content:'A finished response.'}}]} };

test('thinking is visible during a request and replaced smoothly without rebuilding history', async ({page}) => {
  const release = await setup(page);
  await expect(page.locator('.thinking-model')).toHaveText('gpt-4o-mini');
  await expect(page.locator('#send')).toBeDisabled();
  await expect(page.locator('#send')).toHaveAttribute('aria-label','Waiting for model response');
  await expect(page.locator('#composerHint')).toHaveText('Your model is thinking…');
  await page.locator('.message.user').evaluate(el => window.originalUserMessage = el);
  release(success);
  await expect(page.locator('.thinking-card')).toHaveCount(0);
  await expect(page.locator('.message.assistant')).toHaveText('A finished response.');
  await expect(page.locator('#send')).toBeEnabled();
  expect(await page.locator('.message.user').evaluate(el => el === window.originalUserMessage)).toBe(true);
  await expect(page.locator('.composer-shell')).not.toHaveClass(/is-thinking/);
});

test('errors clear the thinking state and allow another message', async ({page}) => {
  const release = await setup(page);
  release({status:429,json:{error:{message:'Quota reached'}}});
  await expect(page.locator('.message.error')).toContainText('Quota reached');
  await expect(page.locator('.thinking-card')).toHaveCount(0);
  await expect(page.locator('#send')).toBeEnabled();
  await expect(page.locator('.model-area')).not.toHaveClass(/is-thinking/);
});

test('pending work stays attached to its conversation', async ({page}) => {
  const release = await setup(page);
  await page.locator('#newChat').click();
  await expect(page.locator('.thinking-card')).toHaveCount(0);
  await expect(page.locator('#composerHint')).toContainText('another chat');
  await page.locator('#history button').filter({hasText:'Hello'}).click();
  await expect(page.locator('.thinking-card')).toBeVisible();
  release(success);
  await expect(page.locator('.thinking-card')).toHaveCount(0);
});

test('reduced motion leaves a readable, static thinking indicator on mobile', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:844});
  const release = await setup(page);
  expect(await page.locator('.quest-server-lights path').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('status', {name:'Request progress'})).toBeVisible();
  release(success);
  await expect(page.locator('.thinking-card')).toHaveCount(0);
});

test('reloading an interrupted request does not leave a perpetual thinking state',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('modeldeck-ghpages-v2',JSON.stringify({chats:[{id:'interrupted',title:'Interrupted',provider:'openrouter',model:'openai/gpt-4o-mini',messages:[{role:'assistant',content:'Thinking…',loading:true}]}]})));
  await page.goto('/');
  await expect(page.locator('.message.error')).toContainText('interrupted');
  await expect(page.locator('.thinking-card')).toHaveCount(0);
  await expect(page.locator('#send')).toBeEnabled();
});
