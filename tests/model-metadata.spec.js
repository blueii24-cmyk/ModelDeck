import { test, expect } from "@playwright/test";
import {
  extractModelCatalog,
  normalizeModel,
  pricingFor,
  describeModel,
  reconcileImports,
  capabilitiesFor,
} from "../src/models/metadata";

test("pricing accepts only trustworthy zero token costs and no other advertised charges", () => {
  for (const pricing of [
    { prompt: 0, completion: 0 },
    { prompt: "0", completion: "0.00" },
    { prompt: "0e-9", completion: 0, request: "0" },
  ])
    expect(pricingFor("openrouter", { pricing })).toBe("free");
  for (const pricing of [
    { prompt: 0 },
    { prompt: null, completion: 0 },
    { prompt: false, completion: 0 },
    { prompt: "", completion: "0" },
    { prompt: "free", completion: "0" },
    { prompt: "-1", completion: "0" },
    { prompt: "Infinity", completion: 0 },
    { prompt: 0, completion: 0, image: null },
  ])
    expect(pricingFor("openrouter", { pricing })).toBe("unknown");
  for (const pricing of [
    { prompt: "0.000001", completion: 0 },
    { prompt: 0, completion: "1" },
    { prompt: 0, completion: 0, request: "0.1" },
    { prompt: "1e-9999", completion: "0" },
  ])
    expect(pricingFor("openrouter", { pricing })).toBe("paid");
  for (const p of [
    "openai",
    "gemini",
    "anthropic",
    "groq",
    "deepseek",
    "nvidia",
    "omniroute",
    "custom",
  ])
    expect(
      pricingFor(p, { pricing: { prompt: 0, completion: 0 }, free: true }),
    ).toBe("unknown");
  expect(pricingFor("openrouter", { id: "model:free" })).toBe("free");
  expect(pricingFor("openrouter", { id: "openrouter/free" })).toBe("free");
  expect(pricingFor("openrouter", { id: "model:free", pricing: { prompt: "0.1", completion: "0" } })).toBe("paid");
});
test("capabilities keep input/output and embeddings separate, with neutral unknowns", () => {
  const vision = normalizeModel("openrouter", {
    id: "anything",
    architecture: {
      input_modalities: ["text", "image"],
      output_modalities: ["text"],
    },
  });
  expect(vision.capabilities).toEqual(
    expect.arrayContaining(["text", "vision", "multimodal"]),
  );
  expect(vision.capabilities).not.toContain("imageOutput");
  const image = normalizeModel("openrouter", {
    id: "anything",
    architecture: { input_modalities: ["text"], output_modalities: ["image"] },
  });
  expect(image.capabilities).toContain("imageOutput");
  expect(image.capabilities).not.toContain("vision");
  expect(image.capabilities).not.toContain("text");
  const media = normalizeModel("openrouter", {
    id: "anything",
    architecture: {
      input_modalities: ["audio", "video", "image", "text"],
      output_modalities: ["text", "audio"],
    },
    supported_parameters: ["reasoning_effort"],
  });
  expect(media.capabilities).toEqual(
    expect.arrayContaining([
      "audioInput",
      "audioOutput",
      "video",
      "vision",
      "text",
      "reasoning",
      "multimodal",
    ]),
  );
  expect(media.videoDirection).toBe("input");
  expect(media.capabilities).not.toContain("imageOutput");
  expect(
    normalizeModel("gemini", {
      name: "models/embed",
      supportedGenerationMethods: ["embedContent"],
    }).capabilities,
  ).toEqual(["embeddings"]);
  expect(
    normalizeModel("gemini", {
      name: "models/unknown",
      supportedGenerationMethods: ["generateContent"],
    }).capabilities,
  ).toEqual([]);
  for (const id of [
    "free-image-gen",
    "video-audio-coder",
    "reasoning-pro",
    "gpt-4o-new-guess",
  ])
    expect(capabilitiesFor("custom", { id }).capabilities).toEqual([]);
  expect(describeModel("deepseek", "deepseek-coder").capabilities).toContain(
    "code",
  );
  expect(describeModel("openai", "tts-1").capabilities).toEqual([
    "audioOutput",
  ]);
  expect(describeModel("groq", "whisper-large-v3").capabilities).toEqual([
    "audioInput",
  ]);
});
test("malformed entries, conflicting duplicates, and older saved models degrade safely", () => {
  const models = extractModelCatalog(
    {
      data: [
        null,
        42,
        "x",
        {},
        {
          id: "duplicate",
          pricing: { prompt: 0, completion: 0 },
          architecture: { output_modalities: ["text"] },
        },
        { id: "duplicate" },
        {
          id: "valid",
          architecture: { input_modalities: "image", output_modalities: null },
          pricing: [],
        },
      ],
    },
    "openrouter",
  );
  expect(models).toHaveLength(2);
  expect(models[0].pricingStatus).toBe("unknown");
  expect(models[0].capabilities).toEqual([]);
  const c = {
    provider: "openrouter",
    freeModelsOnly: true,
    availableModels: [{ id: "manual" }, { id: "oldpaid" }],
  };
  const free = normalizeModel("openrouter", {
    id: "newfree",
    pricing: { prompt: 0, completion: 0 },
  });
  const paid = normalizeModel("openrouter", {
    id: "newpaid",
    pricing: { prompt: 1, completion: 1 },
  });
  const saved = reconcileImports(c, [free, paid]);
  expect(saved.map((x) => x.id)).toEqual(["manual", "oldpaid", "newfree"]);
  expect(
    reconcileImports({ ...c, availableModels: saved }, [free, paid]),
  ).toHaveLength(3);
  expect(
    describeModel("openrouter", { id: "looks:free", free: true }).pricingStatus,
  ).toBe("free");
});

const catalog = [
  {
    id: "free-vision",
    name: "Vision Zero",
    pricing: { prompt: "0", completion: "0" },
    architecture: {
      input_modalities: ["text", "image"],
      output_modalities: ["text"],
    },
  },
  {
    id: "paid-chat",
    name: "Paid Chat",
    pricing: { prompt: "0.1", completion: "0.1" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  },
  {
    id: "sounding:free",
    name: "Unknown Price",
    architecture: { input_modalities: ["text"], output_modalities: ["image"] },
  },
  {
    id: "media",
    name: "Media Model",
    pricing: { prompt: "1", completion: "1" },
    architecture: {
      input_modalities: ["text", "audio", "video"],
      output_modalities: ["text", "audio"],
    },
    supported_parameters: ["reasoning"],
  },
  { id: "neutral", name: "Unknown Capabilities" },
];
const profile = {
  id: "router",
  name: "Router",
  provider: "openrouter",
  apiKey: "test-only-key",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "manual-model",
  availableModels: [{ id: "saved-no-pricing" }],
};
async function setup(page, p = profile) {
  await page.addInitScript((p) => {
    if (!localStorage.getItem("modeldeck-ghpages-v2"))
      localStorage.setItem(
        "modeldeck-ghpages-v2",
        JSON.stringify({
          connections: [p],
          selectedConnectionId: p.id,
          chats: [],
        }),
      );
  }, p);
  await page.goto("/");
  await page.getByRole("button", { name: "Models & discovery" }).click();
}
test("free-only import is reversible, persisted and never deletes saved or manual models", async ({
  page,
}) => {
  let calls = 0;
  await page.route("https://openrouter.ai/api/v1/models", (r) => {
    calls++;
    return r.fulfill({ json: { data: [...catalog, catalog[0]] } });
  });
  await setup(page);
  await page.getByLabel("Free models only", { exact: true }).check();
  await page.locator("#refreshModels").click();
  await expect(page.locator("#modelState")).toContainText(
    "Imported 2 matching models",
  );
  await expect(page.locator(".catalog-row")).toHaveCount(2);
  await expect(page.locator(".catalog-row .free-badge")).toHaveCount(2);
  await expect(page.locator(".catalog-row .free-badge").first()).toHaveText("FREE");
  await expect(page.locator(".catalog-row .free-badge").last()).toHaveText("FREE");
  await expect(page.locator("#modelId")).toHaveValue("manual-model");
  await expect(page.locator("#pricingNotice")).toContainText("Quotas");
  await page.getByLabel("Free models only", { exact: true }).uncheck();
  await expect(page.locator(".catalog-row")).toHaveCount(5);
  expect(calls).toBe(1);
  await page.locator("#refreshModels").click();
  await expect(page.locator("#modelState")).toContainText(
    "Imported 5 matching models",
  );
  await page.getByLabel("Free models only", { exact: true }).check();
  await expect(page.locator(".catalog-row")).toHaveCount(2);
  await page.locator("#close").click();
  await page.getByRole("button", { name: "Switch model", exact: true }).click();
  await expect(
    page.getByRole("option", { name: /saved-no-pricing/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: /manual-model/ }),
  ).toBeVisible();
  await expect(page.getByRole("option", { name: /Paid Chat/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Models & discovery" }).click();
  await expect(page.locator("#freeModelsOnly")).toBeChecked();
  await expect(page.locator(".catalog-row")).toHaveCount(1);
  expect(calls).toBe(2);
  const persisted = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("modeldeck-ghpages-v2")).connections[0],
  );
  expect(new Set(persisted.availableModels.map((m) => m.id)).size).toBe(
    persisted.availableModels.length,
  );
  expect(persisted.availableModels).toHaveLength(6);
});
test("icons render in discovery, picker, active model, dashboard and connection settings", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://openrouter.ai/api/v1/models", (r) =>
    r.fulfill({ json: { data: catalog } }),
  );
  await setup(page);
  await page.locator("#refreshModels").click();
  const vision = page
    .locator(".catalog-row")
    .filter({ hasText: "Vision Zero" });
  await expect(
    vision.getByRole("img", {
      name: "Image understanding / vision",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    vision.getByRole("img", { name: "Image generation", exact: true }),
  ).toHaveCount(0);
  const media = page.locator(".catalog-row").filter({ hasText: "Media Model" });
  await expect(
    media.getByRole("img", { name: "Audio input", exact: true }),
  ).toBeVisible();
  await expect(
    media.getByRole("img", {
      name: "Audio output / text-to-speech",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    media.getByRole("img", { name: "Video (input)", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".catalog-row")
      .filter({ hasText: "Unknown Capabilities" })
      .getByRole("img", { name: "Capability unknown" }),
  ).toBeVisible();
  await vision.click();
  await page.locator("#save").click();
  await expect(page.locator("#model")).toHaveValue("free-vision");
  await expect(page.locator(".model-card.selected .free-badge")).toHaveText(
    "FREE",
  );
  await expect(page.locator(".workspace-title .free-badge")).toHaveText("FREE");
  await page.getByRole("button", { name: "Switch model", exact: true }).click();
  await expect(
    page
      .getByRole("option", { name: /Vision Zero/ })
      .getByRole("img", { name: "Image understanding / vision", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Switch model", exact: true }),
  ).toBeFocused();
  await page.locator("#connections").click();
  await expect(page.locator("#connectionCapabilities .free-badge")).toHaveText(
    "FREE",
  );
  await expect(
    page
      .locator("#connectionCapabilities")
      .getByRole("img", { name: "Image understanding / vision", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("unknown-pricing providers import nothing in free mode without losing saved models", async ({
  page,
}) => {
  await page.route("https://api.openai.com/v1/models", (r) =>
    r.fulfill({
      json: {
        data: [
          { id: "tts-1", pricing: { prompt: 0, completion: 0 } },
          { id: "text-embedding-3-small" },
          { id: "gpt-4o-mini" },
        ],
      },
    }),
  );
  await setup(page, {
    ...profile,
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
  });
  await page.locator("#freeModelsOnly").check();
  await page.locator("#refreshModels").click();
  await expect(page.locator("#modelState")).toContainText(
    "Imported 0 matching models",
  );
  await expect(page.locator("#pricingNotice")).toContainText(
    "Free status unavailable for this provider",
  );
  await expect(page.locator(".catalog-row")).toHaveCount(0);
  await page.locator("#freeModelsOnly").uncheck();
  await expect(page.locator(".catalog-row")).toHaveCount(3);
  await expect(page.locator(".catalog-row .free-badge")).toHaveCount(0);
  await expect(
    page
      .locator(".catalog-row")
      .filter({ hasText: "text-embedding-3-small" })
      .getByRole("img", { name: "Embeddings", exact: true }),
  ).toBeVisible();
  await page.locator("#modelId").fill("my-manual-model");
  await page.locator("#save").click();
  await expect(page.locator("#model")).toHaveValue("my-manual-model");
});
test("mobile metadata and picker fit the viewport with working selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://openrouter.ai/api/v1/models", (r) =>
    r.fulfill({ json: { data: catalog } }),
  );
  await setup(page);
  await page.locator("#refreshModels").click();
  await expect(page.locator(".catalog-row")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/model-discovery-mobile.png" });
  await page.locator("#close").click();
  await page.getByRole("button", { name: "Switch model", exact: true }).click();
  await expect(page.getByRole("option", { name: /Vision Zero/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("option", { name: /Vision Zero/ }).click();
  await expect(page.locator("#model")).toHaveValue("free-vision");
});

test("connection configuration applies free-only before automatic import and preferences are independent", async ({
  page,
}) => {
  let imported = 0;
  await page.route("https://openrouter.ai/api/v1/models", (route) => {
    imported++;
    return route.fulfill({ json: { data: catalog } });
  });
  await setup(page);
  await page.locator("#close").click();
  await page.locator("#connections").click();
  await page.locator("#connectionFreeOnly").check();
  await page.locator("#save").click();
  await expect(page.locator("#status")).toContainText(
    "Imported 2 matching models",
  );
  await page.getByRole("button", { name: "Switch model", exact: true }).click();
  await expect(page.getByRole("option", { name: /Vision Zero/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Paid Chat/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.locator("#connections").click();
  await page.locator("#addConnection").click();
  await expect(page.locator("#connectionFreeOnly")).not.toBeChecked();
  await page.locator("#savedConnection").selectOption("router");
  await expect(page.locator("#connectionFreeOnly")).toBeChecked();
  expect(imported).toBe(1);
});
test("a discovered free model can be selected and used for the original chat flow", async ({
  page,
}) => {
  await page.route("https://openrouter.ai/api/v1/models", (r) =>
    r.fulfill({ json: { data: catalog } }),
  );
  let sent = false;
  await page.route("https://openrouter.ai/api/v1/chat/completions", (r) => {
    expect(r.request().postDataJSON().model).toBe("free-vision");
    expect(r.request().headers().authorization).toBe("Bearer test-only-key");
    sent = true;
    return r.fulfill({
      json: {
        choices: [{ message: { content: "Real chat path, mocked response." } }],
      },
    });
  });
  await setup(page);
  await page.locator("#freeModelsOnly").check();
  await page.locator("#refreshModels").click();
  await page.locator(".catalog-row").filter({ hasText: "Vision Zero" }).click();
  await page.locator("#save").click();
  await page.locator("#prompt").fill("Hello");
  await page.locator("#send").click();
  await expect(page.locator(".message.assistant")).toHaveText(
    "Real chat path, mocked response.",
  );
  expect(sent).toBe(true);
});
test("legacy directional modalities and code maps are conservative", () => {
  expect(
    capabilitiesFor("openrouter", {
      id: "legacy",
      architecture: { modality: "text+image->text" },
    }).capabilities,
  ).toEqual(expect.arrayContaining(["text", "vision", "multimodal"]));
  expect(
    capabilitiesFor("openrouter", {
      id: "legacy",
      architecture: { modality: "text->image" },
    }).capabilities,
  ).not.toContain("vision");
  expect(
    capabilitiesFor("deepseek", { id: "deepseek-coder" }).capabilities,
  ).toContain("code");
  expect(
    capabilitiesFor("openrouter", {
      id: "totally-code-special",
      architecture: { input_modalities: ["text"], output_modalities: ["text"] },
    }).capabilities,
  ).not.toContain("code");
});

test("refreshing changed prices removes stale FREE badges without deleting saved models", async ({
  page,
}) => {
  let current = catalog;
  await page.route("https://openrouter.ai/api/v1/models", (r) =>
    r.fulfill({ json: { data: current } }),
  );
  await setup(page);
  await page.locator("#freeModelsOnly").check();
  await page.locator("#refreshModels").click();
  await expect(page.locator(".catalog-row")).toHaveCount(1);
  current = catalog.map((m) =>
    m.id === "free-vision"
      ? { ...m, pricing: { prompt: "1", completion: "1" } }
      : m,
  );
  await page.locator("#refreshModels").click();
  await expect(page.locator("#modelState")).toContainText(
    "Imported 1 matching models",
  );
  await expect(page.locator(".catalog-row")).toHaveCount(1);
  await expect(page.locator(".catalog-row").first()).toContainText("sounding:free");
  await page.locator("#close").click();
  await page.getByRole("button", { name: "Switch model", exact: true }).click();
  const saved = page.getByRole("option", { name: /Vision Zero/ });
  await expect(saved).toBeVisible();
  await expect(saved.locator(".free-badge")).toHaveCount(0);
});
test("known non-chat models show an actionable warning instead of using an incompatible API", async ({
  page,
}) => {
  let chatRequests = 0;
  await page.route("https://api.openai.com/v1/chat/completions", (r) => {
    chatRequests++;
    return r.abort();
  });
  await setup(page, {
    ...profile,
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
  });
  await page.locator("#modelId").fill("text-embedding-3-small");
  await page.locator("#save").click();
  await page.locator("#prompt").fill("Test embeddings");
  await page.locator("#send").click();
  await expect(page.locator("#formNotice")).toContainText(
    "requires a non-text API workflow",
  );
  expect(chatRequests).toBe(0);
});
