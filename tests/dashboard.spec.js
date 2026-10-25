import { test, expect } from "@playwright/test";
const profile = (
  id,
  provider = "openai",
  baseUrl = "https://api.openai.com/v1",
  model = "gpt-4o-mini",
) => ({
  id,
  name: `Profile ${id}`,
  provider,
  apiKey: `private-key-${id}`,
  baseUrl,
  model,
  availableModels: [],
});
async function seed(page, connections) {
  await page.addInitScript(
    (data) =>
      localStorage.setItem(
        "modeldeck-ghpages-v2",
        JSON.stringify({
          connections: data,
          selectedConnectionId: data[0].id,
          chats: [],
        }),
      ),
    connections,
  );
}
test("dashboard defaults dark, has honest states, collapses and fits desktop/mobile", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
  await expect(page.locator(".model-card")).toHaveCount(9);
  await expect(page.locator(".model-card").first()).toContainText(
    "Not configured",
  );
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.locator("html")).toHaveClass(/sidebar-collapsed/);
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({ path: "test-results/dashboard-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator("#side")).toHaveClass(/open/);
  await page
    .getByRole("button", { name: "Close navigation" })
    .click({ position: { x: 380, y: 120 } });
  await page.screenshot({ path: "test-results/dashboard-phone.png" });
  expect(errors).toEqual([]);
});
test("same-provider profiles refresh from their own endpoints and never swap on late results", async ({
  page,
}) => {
  await seed(page, [
    profile("one"),
    profile("two", "openai", "https://gateway.example/v1"),
  ]);
  let release;
  const held = new Promise((r) => (release = r));
  await page.route("https://api.openai.com/v1/models", async (route) => {
    expect(route.request().headers().authorization).toBe(
      "Bearer private-key-one",
    );
    await held;
    await route.fulfill({ json: { data: [{ id: "first-model" }] } });
  });
  await page.route("https://gateway.example/v1/models", (route) => {
    expect(route.request().headers().authorization).toBe(
      "Bearer private-key-two",
    );
    return route.fulfill({ json: { data: [{ id: "second-model" }] } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Models & discovery" }).click();
  await page.locator("#refreshModels").click();
  await page.locator("#close").click();
  await page
    .locator(".connection-row")
    .filter({ hasText: "Profile two" })
    .click();
  await expect(page.locator("#savedConnection")).toHaveValue("two");
  await page.locator("#close").click();
  release();
  await expect(
    page.locator(".connection-row").filter({ hasText: "Profile one" }),
  ).toContainText("Models loaded");
  await expect(page.locator(".workspace-info .model-detail")).toContainText(
    "gpt-4o-mini",
  );
  await page.getByRole("button", { name: "Models & discovery" }).click();
  await page.locator("#refreshModels").click();
  await expect(page.locator("#modelList")).toContainText("second-model");
  await expect(page.locator("#modelList")).not.toContainText("first-model");
  await page.locator("#modelList").selectOption("second-model");
  await page.locator("#save").click();
  await expect(page.locator("#model")).toHaveValue("second-model");
});
test("provider editing resets stale models and Gemini discovery uses its own auth and endpoint", async ({
  page,
}) => {
  await seed(page, [
    { ...profile("edit"), availableModels: [{ id: "old-model" }] },
  ]);
  await page.route(
    "https://generativelanguage.googleapis.com/v1beta/models?key=*",
    (route) => {
      expect(route.request().headers().authorization).toBeUndefined();
      expect(new URL(route.request().url()).searchParams.get("key")).toBe(
        "new-gemini-secret",
      );
      return route.fulfill({
        json: {
          models: [
            {
              name: "models/gemini-test",
              displayName: "Test Gemini",
              supportedGenerationMethods: ["generateContent"],
            },
            {
              name: "models/embedding",
              supportedGenerationMethods: ["embedContent"],
            },
          ],
        },
      });
    },
  );
  await page.goto("/");
  await page.locator("#connections").click();
  await page.locator("#provider").selectOption("gemini");
  await page.locator("#apiKey").fill("new-gemini-secret");
  await page.locator("#testConnection").click();
  await expect(page.locator("#connectionTestState")).toContainText(
    "Model endpoint reachable",
  );
  await expect(page.locator("#apiKey")).toHaveAttribute("type", "password");
  await page.locator("#save").click();
  await expect(page.locator("#status")).toContainText("Imported 2 matching models");
  await page.getByRole("button", { name: "Models & discovery" }).click();
  await expect(page.locator("#modelList")).toContainText("gemini-test");
  await expect(page.locator("#modelList")).not.toContainText("old-model");
  await expect(page.locator("#modelList")).toContainText("embedding");
});
test("discovery failure is redacted and chat fallback is opt-in with provider-specific auth", async ({
  page,
}) => {
  await seed(page, [
    profile(
      "claude",
      "anthropic",
      "https://api.anthropic.com/v1",
      "claude-test",
    ),
  ]);
  let chatCalls = 0;
  await page.route("https://api.anthropic.com/v1/models", (route) =>
    route.fulfill({
      status: 404,
      json: { error: { message: "No discovery for private-key-claude" } },
    }),
  );
  await page.route("https://api.anthropic.com/v1/messages", (route) => {
    chatCalls++;
    const h = route.request().headers();
    expect(h["x-api-key"]).toBe("private-key-claude");
    expect(h["anthropic-version"]).toBe("2023-06-01");
    expect(route.request().postDataJSON().model).toBe("claude-test");
    return route.fulfill({ json: { content: [{ type: "text", text: "OK" }] } });
  });
  await page.goto("/");
  await page.locator("#connections").click();
  await page.locator("#testConnection").click();
  await expect(page.locator("#connectionTestState")).toContainText(
    "enable the optional chat test",
  );
  expect(chatCalls).toBe(0);
  await expect(page.locator("#connectionTestState")).not.toContainText(
    "private-key-claude",
  );
  await expect(page.locator("#connectionTestState")).toContainText(
    "[redacted]",
  );
  await page.locator("#allowChatTest").check();
  await page.locator("#testConnection").click();
  await expect(page.locator("#connectionTestState")).toContainText(
    "API key works",
  );
  expect(chatCalls).toBe(1);
  await page.locator("#close").click();
  await expect(page.locator(".connection-row")).toContainText("Verified");
});

for (const provider of [
  "openai",
  "openrouter",
  "gemini",
  "anthropic",
  "groq",
  "deepseek",
  "nvidia",
  "omniroute",
  "custom",
]) {
  test(`${provider} selected profile retains its chat protocol and authentication`, async ({
    page,
  }) => {
    const base = "https://provider.example/v1";
    const model =
      provider === "gemini"
        ? "gemini-test"
        : provider === "anthropic"
          ? "claude-test"
          : "test-model";
    await seed(page, [profile("protocol", provider, base, model)]);
    let calls = 0;
    await page.route("https://provider.example/**", (route) => {
      const req = route.request(),
        body = req.postDataJSON(),
        h = req.headers();
      calls++;
      if (provider === "gemini") {
        expect(req.url()).toContain(
          "/models/gemini-test:generateContent?key=private-key-protocol",
        );
        expect(h.authorization).toBeUndefined();
        expect(body.contents[0].parts[0].text).toBe("Protocol test");
        return route.fulfill({
          json: {
            candidates: [{ content: { parts: [{ text: "Protocol OK" }] } }],
          },
        });
      }
      if (provider === "anthropic") {
        expect(req.url()).toBe(base + "/messages");
        expect(h["x-api-key"]).toBe("private-key-protocol");
        expect(h["anthropic-dangerous-direct-browser-access"]).toBe("true");
        expect(body.max_tokens).toBe(2048);
        return route.fulfill({
          json: { content: [{ type: "text", text: "Protocol OK" }] },
        });
      }
      expect(req.url()).toBe(base + "/chat/completions");
      expect(h.authorization).toBe("Bearer private-key-protocol");
      expect(body.model).toBe(model);
      expect(body.messages[0].content).toBe("Protocol test");
      if (provider === "openrouter") {
        expect(h["x-title"]).toBe("ModelDeck");
        expect(h["http-referer"]).toBeTruthy();
      }
      return route.fulfill({
        json: { choices: [{ message: { content: "Protocol OK" } }] },
      });
    });
    await page.goto("/");
    await page.locator("#prompt").fill("Protocol test");
    await page.locator("#send").click();
    await expect(page.locator(".message.assistant")).toHaveText("Protocol OK");
    expect(calls).toBe(1);
    await expect(page.locator(".connection-row")).toContainText("Verified");
  });
}

test("gallery selection routes chat to the chosen provider instead of the previous connection", async ({
  page,
}) => {
  await seed(page, [
    profile("openai"),
    profile(
      "deepseek",
      "deepseek",
      "https://api.deepseek.com",
      "deepseek-chat",
    ),
  ]);
  await page.route("https://api.deepseek.com/chat/completions", (route) => {
    expect(route.request().headers().authorization).toBe(
      "Bearer private-key-deepseek",
    );
    return route.fulfill({
      json: { choices: [{ message: { content: "Selected correctly" } }] },
    });
  });
  await page.goto("/");
  await page
    .locator(".model-card")
    .filter({
      has: page.getByRole("heading", { name: "DeepSeek", exact: true }),
    })
    .getByRole("button", { name: "Select model" })
    .click();
  await expect(page.locator("#model")).toHaveValue("deepseek-chat");
  await page.locator("#prompt").fill("Hi");
  await page.locator("#send").click();
  await expect(page.locator(".message.assistant")).toHaveText(
    "Selected correctly",
  );
});

test('a late chat response cannot verify newly edited credentials', async ({ page }) => {
  await seed(page, [profile('changing')]);
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('https://api.openai.com/v1/chat/completions', async route => {
    await held;
    await route.fulfill({json:{choices:[{message:{content:'Earlier credential response'}}]}});
  });
  await page.route('https://api.openai.com/v1/models', route => {
    expect(route.request().headers().authorization).toBe('Bearer replacement-key');
    return route.fulfill({json:{data:[{id:'gpt-4o-mini'}]}});
  });
  await page.goto('/');
  await page.locator('#prompt').fill('Hello');
  await page.locator('#send').click();
  await expect(page.locator('.thinking-card')).toBeVisible();
  await page.locator('#connections').click();
  await page.locator('#apiKey').fill('replacement-key');
  await page.locator('#save').click();
  await expect(page.locator('.connection-row')).toContainText('Models loaded');
  release();
  await expect(page.locator('.message.assistant')).toHaveText('Earlier credential response');
  await expect(page.locator('.connection-row')).toContainText('Models loaded');
  await expect(page.locator('.connection-row')).not.toContainText('Verified');
});
