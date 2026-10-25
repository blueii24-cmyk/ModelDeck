import { test, expect } from "@playwright/test";
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const image = {
  name: "pixel.png",
  mimeType: "image/png",
  buffer: Buffer.from(png, "base64"),
};
async function setup(page, provider = "openai") {
  await page.addInitScript(
    ({ provider }) => {
      if (!localStorage.getItem("modeldeck-ghpages-v2"))
        localStorage.setItem(
          "modeldeck-ghpages-v2",
          JSON.stringify({
            connections: [
              {
                id: "test",
                name: "Test",
                provider,
                apiKey: "test-only",
                baseUrl: "https://provider.example/v1",
                model: "test-model",
                availableModels: [],
              },
            ],
            selectedConnectionId: "test",
            chats: [],
          }),
        );
    },
    { provider },
  );
  await page.goto("/");
}
async function attach(page) {
  await page.locator("#imageFiles").setInputFiles(image);
  await expect(page.locator(".attachment-chip")).toHaveCount(1);
}
for (const provider of ["openai", "anthropic", "gemini", "openrouter"])
  test(`${provider} sends image input in its native format and persists it`, async ({
    page,
  }) => {
    let body;
    await page.route("https://provider.example/**", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({
        json:
          provider === "gemini"
            ? { candidates: [{ content: { parts: [{ text: "A pixel." }] } }] }
            : provider === "anthropic"
              ? { content: [{ type: "text", text: "A pixel." }] }
              : { choices: [{ message: { content: "A pixel." } }] },
      });
    });
    await setup(page, provider);
    await attach(page);
    await page.locator("#prompt").fill("Describe");
    await page.locator("#send").click();
    await expect(page.locator(".message.assistant")).toHaveText("A pixel.");
    const part =
      provider === "gemini"
        ? body.contents[0].parts[1]
        : body.messages[0].content[1];
    if (provider === "gemini")
      expect(part.inlineData).toEqual({ mimeType: "image/png", data: png });
    else if (provider === "anthropic")
      expect(part.source).toEqual({
        type: "base64",
        media_type: "image/png",
        data: png,
      });
    else expect(part.image_url.url).toBe("data:image/png;base64," + png);
    expect(
      await page.evaluate(() => localStorage.getItem("modeldeck-ghpages-v2")),
    ).not.toContain(png);
    await page.reload();
    await expect(page.locator(".message.user img")).toHaveCount(1);
    await expect
      .poll(() =>
        page.locator(".message.user img").evaluate((i) => i.naturalWidth),
      )
      .toBe(1);
  });
for (const provider of ["openai", "omniroute", "gemini", "openrouter"])
  test(`${provider} displays real image-only generation responses`, async ({
    page,
  }) => {
    let body, url;
    await page.route("https://provider.example/**", async (route) => {
      body = route.request().postDataJSON();
      url = route.request().url();
      await route.fulfill({
        json:
          provider === "gemini"
            ? {
                candidates: [
                  {
                    content: {
                      parts: [
                        { inlineData: { mimeType: "image/png", data: png } },
                      ],
                    },
                  },
                ],
              }
            : provider === "openrouter"
              ? {
                  choices: [
                    {
                      message: {
                        content: null,
                        images: [
                          {
                            type: "image_url",
                            image_url: { url: "data:image/png;base64," + png },
                          },
                        ],
                      },
                    },
                  ],
                }
              : { data: [{ b64_json: png }] },
      });
    });
    await setup(page, provider);
    await page.locator("#requestMode").selectOption("image");
    await page.locator("#prompt").fill("Draw a pixel");
    await page.locator("#send").click();
    await expect(page.locator(".message.assistant img")).toHaveCount(1);
    await expect
      .poll(() =>
        page.locator(".message.assistant img").evaluate((i) => i.naturalWidth),
      )
      .toBe(1);
    if (provider === "gemini")
      expect(body.generationConfig.responseModalities).toEqual([
        "TEXT",
        "IMAGE",
      ]);
    else if (provider === "openrouter")
      expect(body.modalities).toEqual(["image", "text"]);
    else {
      expect(url).toBe("https://provider.example/v1/images/generations");
      expect(body.prompt).toBe("Draw a pixel");
    }
    await expect(
      page.getByRole("link", { name: "Download image" }),
    ).toHaveAttribute("download", "generated-1.png");
  });
test("Markdown and highlighted code are safe, copyable and responsive", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (text) => (window.copiedCode = text) },
    }),
  );
  await page.route("https://provider.example/**", (route) =>
    route.fulfill({
      json: {
        choices: [
          {
            message: {
              content:
                '## Code\n**Bold** and `inline`\n\n```javascript\nconst answer = 42;\n```\n\n| A | B |\n|---|---|\n| one | two |\n<script>window.unsafe=true</script><img src=x onerror="window.unsafe=true"><a href="javascript:alert(1)">bad</a>\n![Reference](https://example.com/image.png)',
            },
          },
        ],
      },
    }),
  );
  await setup(page);
  await page.locator("#prompt").fill("Code please");
  await page.locator("#send").click();
  await expect(page.locator(".markdown-body h2")).toHaveText("Code");
  await expect(page.locator(".hljs-keyword")).toHaveText("const");
  await expect(page.locator(".markdown-body table")).toHaveCount(1);
  await page.getByRole("button", { name: "Copy javascript code" }).click();
  expect(await page.evaluate(() => window.copiedCode)).toBe(
    "const answer = 42;\n",
  );
  expect(await page.evaluate(() => window.unsafe)).toBeUndefined();
  await expect(
    page.locator(
      '.markdown-body img, .markdown-body script, .markdown-body a[href^="javascript:"]',
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Image: Reference" }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("rejects unsafe uploads and removes attachments before sending", async ({
  page,
}) => {
  await setup(page);
  await page
    .locator("#imageFiles")
    .setInputFiles({
      name: "bad.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
  await expect(page.locator(".attachment-chip")).toHaveCount(0);
  await attach(page);
  await page.getByRole("button", { name: "Remove pixel.png" }).click();
  await expect(page.locator(".attachment-chip")).toHaveCount(0);
});
test("provider failures never fabricate an image", async ({ page }) => {
  await page.route("https://provider.example/**", (route) =>
    route.fulfill({
      json: {
        choices: [
          { message: { content: "This model cannot generate images." } },
        ],
      },
    }),
  );
  await setup(page, "openrouter");
  await page.locator("#requestMode").selectOption("image");
  await page.locator("#prompt").fill("Draw a pixel");
  await page.locator("#send").click();
  await expect(page.locator(".message.assistant")).toContainText(
    "No image was returned",
  );
  await expect(page.locator(".message.assistant img")).toHaveCount(0);
});
