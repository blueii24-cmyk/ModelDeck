import { test, expect } from "@playwright/test";
import {
  createQuest,
  advanceQuest,
  failQuest,
  stageState,
} from "../src/thinking/quest";
const key = "modeldeck-ghpages-v2";
async function prepare(page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("modeldeck-ghpages-v2"))
      localStorage.setItem(
        "modeldeck-ghpages-v2",
        JSON.stringify({
          connections: [
            {
              id: "quest",
              name: "Quest key",
              provider: "openai",
              apiKey: "synthetic-quest-key",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              availableModels: [],
            },
          ],
          selectedConnectionId: "quest",
          chats: [],
        }),
      );
    const original = window.fetch;
    window.fetch = (url, init) => {
      if (!String(url).includes("/chat/completions"))
        return original(url, init);
      window.requestAtFetch = {
        stage: document.querySelector(".quest-world")?.dataset.stage,
        body: JSON.parse(init.body),
      };
      return new Promise((resolve, reject) => {
        let controller;
        const stream = new ReadableStream({
          start(c) {
            controller = c;
          },
        });
        window.questHeaders = (status = 200) =>
          resolve(
            new Response(stream, {
              status,
              headers: { "Content-Type": "application/json" },
            }),
          );
        window.questBody = (text) => {
          controller.enqueue(new TextEncoder().encode(text));
          controller.close();
        };
        init.signal.addEventListener(
          "abort",
          () => {
            const error = new DOMException("Aborted", "AbortError");
            reject(error);
            controller.error(error);
          },
          { once: true },
        );
      });
    };
  });
  await page.goto("/");
}
const start = async (page) => {
  await page.locator("#prompt").fill("Build a little world");
  await page.locator("#send").click();
  await expect(page.locator(".quest-world")).toHaveAttribute(
    "data-stage",
    "waiting",
  );
};
const finish = async (page) => {
  await page.evaluate(() => window.questHeaders());
  await page.evaluate(() =>
    window.questBody(
      JSON.stringify({
        choices: [{ message: { content: "The finished answer." } }],
      }),
    ),
  );
  await expect(page.locator(".message.assistant")).toHaveText(
    "The finished answer.",
  );
};
const savedQuest = (page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("modeldeck-ghpages-v2"))
        .chats.find((c) => c.title === "Build a little world")
        .messages.at(-1).quest,
  );

test("quest state is monotonic and failure never completes later stages", () => {
  const quest = createQuest("OpenAI", "test");
  expect(stageState(quest, "preparing")).toBe("active");
  advanceQuest(quest, "sending");
  advanceQuest(quest, "waiting");
  expect(advanceQuest(quest, "sending")).toBe(false);
  failQuest(quest);
  expect(stageState(quest, "waiting")).toBe("failed");
  expect(stageState(quest, "complete")).toBe("pending");
  expect(advanceQuest(quest, "complete")).toBe(false);
});

test("real fetch/header/body boundaries drive stages with stable nodes and immediate answer", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await prepare(page);
  await start(page);
  expect(await page.evaluate(() => window.requestAtFetch.stage)).toBe(
    "sending",
  );
  expect(await savedQuest(page)).toMatchObject({
    stage: "waiting",
    provider: "OpenAI",
    model: "gpt-4o-mini",
    reached: ["preparing", "sending", "waiting"],
  });
  await expect(page.locator(".quest-provider")).toHaveText("OpenAI");
  await expect(page.locator(".thinking-model")).toHaveText("gpt-4o-mini");
  await page
    .locator(".quest-scene")
    .evaluate((el) => (window.originalScene = el));
  await page
    .locator(".message.user")
    .evaluate((el) => (window.originalUser = el));
  await page
    .locator("#history button")
    .evaluate((el) => (window.originalHistory = el));
  await page.evaluate(() => window.questHeaders());
  await expect(page.locator(".quest-world")).toHaveAttribute(
    "data-stage",
    "receiving",
  );
  await expect(
    page.getByRole("status", { name: "Request progress" }),
  ).toContainText("Reading the response body");
  expect(
    await page
      .locator(".quest-scene")
      .evaluate((el) => el === window.originalScene),
  ).toBe(true);
  expect(
    await page
      .locator("#history button")
      .evaluate((el) => el === window.originalHistory),
  ).toBe(true);
  await page.evaluate(() =>
    window.questBody(
      JSON.stringify({
        choices: [{ message: { content: "The finished answer." } }],
      }),
    ),
  );
  await expect(page.locator(".message.assistant")).toHaveText(
    "The finished answer.",
  );
  await expect(page.locator(".thinking-card")).toHaveCount(0);
  await expect(page.locator("#send")).toBeEnabled();
  expect((await savedQuest(page)).reached).toEqual([
    "preparing",
    "sending",
    "waiting",
    "receiving",
    "finishing",
    "complete",
  ]);
  expect(
    await page
      .locator(".message.user")
      .evaluate((el) => el === window.originalUser),
  ).toBe(true);
  expect(
    await page.evaluate(() => window.requestAtFetch.body.messages),
  ).toEqual([{ role: "user", content: "Build a little world" }]);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((a) => a.effect?.target?.closest(".quest-world")).length,
      ),
    )
    .toBe(0);
  await expect(page.locator(".quest-delivery")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("waiting is alive but does not fabricate milestones, even after time passes", async ({
  page,
}) => {
  await page.clock.install();
  await prepare(page);
  await start(page);
  await page.clock.fastForward(15000);
  await expect(page.locator(".quest-world")).toHaveAttribute(
    "data-stage",
    "waiting",
  );
  expect((await savedQuest(page)).reached).toEqual([
    "preparing",
    "sending",
    "waiting",
  ]);
  expect(
    await page
      .locator(".quest-server-lights path")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("quest-light");
  await page.clock.runFor(350);
  await expect(page.locator(".quest-scene")).toBeInViewport({ ratio: 0.9 });
  await page.screenshot({ path: "test-results/quest-waiting.png" });
  await finish(page);
});

test("quest inspection/collapse/worker interaction cannot advance progress and survives switching chats", async ({
  page,
}) => {
  await prepare(page);
  await start(page);
  await expect(page.locator(".quest-log")).toBeHidden();
  await page.getByRole("button", { name: "Show quest log" }).click();
  await expect(page.locator(".quest-log")).toBeVisible();
  await page.locator(".quest-log [data-step=receiving]").click();
  await expect(page.locator(".quest-inspection")).toContainText(
    "Reading the response body",
  );
  await expect(page.locator(".quest-world")).toHaveAttribute(
    "data-stage",
    "waiting",
  );
  await page.getByRole("button", { name: "What is the worker doing?" }).click();
  await expect(page.locator(".quest-task")).toContainText(
    "Waiting for response headers",
  );
  await page
    .locator(".quest-scene")
    .evaluate((el) => (window.retainedScene = el));
  await page.locator("#newChat").click();
  await expect(page.locator(".quest-world")).toHaveCount(0);
  await expect(page.locator("#composerHint")).toContainText("another chat");
  await page
    .locator("#history button")
    .filter({ hasText: "Build a little world" })
    .click();
  await expect(page.locator(".quest-world")).toHaveAttribute(
    "data-stage",
    "waiting",
  );
  await expect(page.locator(".quest-log")).toBeVisible();
  expect(
    await page
      .locator(".quest-scene")
      .evaluate((el) => el === window.retainedScene),
  ).toBe(true);
  await page.getByRole("button", { name: "Hide quest log" }).click();
  await expect(page.locator(".quest-log")).toBeHidden();
  await finish(page);
});

for (const failure of ["http", "invalid", "timeout"])
  test(`${failure} stops the workshop without false success`, async ({
    page,
  }) => {
    if (failure === "timeout") await page.clock.install();
    await prepare(page);
    await start(page);
    if (failure === "http") {
      await page.evaluate(() => window.questHeaders(429));
      await page.evaluate(() =>
        window.questBody(
          JSON.stringify({ error: { message: "Quota reached" } }),
        ),
      );
    } else if (failure === "invalid") {
      await page.evaluate(() => window.questHeaders());
      await page.evaluate(() => window.questBody("not JSON"));
    } else await page.clock.fastForward(90001);
    await expect(page.locator(".message.error")).toBeVisible();
    await expect(page.locator(".quest-world")).toHaveAttribute(
      "data-stage",
      "error",
    );
    await expect(page.locator(".thinking-card")).toHaveCount(0);
    await expect(page.locator(".quest-delivery")).toHaveCount(0);
    await expect(page.locator("#send")).toBeEnabled();
    const q = await savedQuest(page);
    expect(q.stage).toBe("error");
    expect(q.reached).not.toContain("complete");
    expect(q.reached).not.toContain("finishing");
    await expect(
      page.locator(".quest-mini [data-step=complete]"),
    ).toHaveAttribute("data-state", "pending");
    await expect(
      page.locator(".quest-mini [data-step=" + q.failedStage + "]"),
    ).toHaveAttribute("data-state", "failed");
    if (failure === "timeout")
      await expect(page.locator(".quest-error-copy")).toContainText(
        "timed out",
      );
    expect(
      await page
        .locator(".quest-server-lights path")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
  });

test("interrupted requests restore a stopped world, not an endless quest or a success", async ({
  page,
}) => {
  await prepare(page);
  await start(page);
  await page.evaluate(() => window.questHeaders());
  await expect(page.locator(".quest-world")).toHaveAttribute(
    "data-stage",
    "receiving",
  );
  await page.reload();
  await expect(page.locator(".quest-world")).toHaveAttribute(
    "data-stage",
    "error",
  );
  await expect(page.locator(".quest-error-copy")).toContainText("interrupted");
  await expect(
    page.locator(".quest-mini [data-step=receiving]"),
  ).toHaveAttribute("data-state", "failed");
  await expect(page.locator("#send")).toBeEnabled();
  await expect(page.locator(".thinking-card")).toHaveCount(0);
});

test("compact/reduced-motion mobile scene stays readable with no overflow or animation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepare(page);
  await start(page);
  await expect(
    page.getByRole("status", { name: "Request progress" }),
  ).toContainText("Waiting for response headers");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".quest-world")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  expect(
    await page
      .locator(".quest-runner")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await expect(page.locator(".quest-scene")).toBeInViewport({ ratio: 0.9 });
  await page.screenshot({ path: "test-results/quest-mobile.png" });
  await page.getByRole("button", { name: "Show quest log" }).click();
  await expect(page.locator(".quest-log")).toBeVisible();
  await finish(page);
  await expect(page.locator(".quest-delivery")).toHaveCount(0);
});

test("a second quest preserves the first answer and keeps progress out of provider context", async ({
  page,
}) => {
  await prepare(page);
  await start(page);
  await finish(page);
  await page
    .locator(".message.assistant")
    .evaluate((el) => (window.firstAnswer = el));
  await page.locator("#prompt").fill("Second task");
  await page.locator("#send").click();
  await expect(page.locator(".quest-world")).toHaveAttribute(
    "data-stage",
    "waiting",
  );
  expect(
    await page
      .locator(".message.assistant")
      .first()
      .evaluate((el) => el === window.firstAnswer),
  ).toBe(true);
  await expect(page.locator(".message.assistant").first()).toHaveText(
    "The finished answer.",
  );
  await expect(page.locator("#history button")).toHaveText(
    "Build a little world",
  );
  expect(
    await page.evaluate(() => window.requestAtFetch.body.messages),
  ).toEqual([
    { role: "user", content: "Build a little world" },
    { role: "assistant", content: "The finished answer." },
    { role: "user", content: "Second task" },
  ]);
  await page.evaluate(() => window.questHeaders());
  await page.evaluate(() =>
    window.questBody(
      JSON.stringify({ choices: [{ message: { content: "Second answer" } }] }),
    ),
  );
  await expect(page.locator(".message.assistant").last()).toHaveText(
    "Second answer",
  );
});
test("completion in a background conversation does not steal focus or show a wrong quest", async ({
  page,
}) => {
  await prepare(page);
  await start(page);
  await page.locator("#newChat").click();
  await page.locator("#prompt").fill("Keep my draft");
  await page.evaluate(() => window.questHeaders());
  await page.evaluate(() =>
    window.questBody(
      JSON.stringify({
        choices: [{ message: { content: "The finished answer." } }],
      }),
    ),
  );
  await expect(page.locator("#send")).toBeEnabled();
  await expect(page.locator("#prompt")).toBeFocused();
  await expect(page.locator("#prompt")).toHaveValue("Keep my draft");
  await expect(page.locator(".quest-world")).toHaveCount(0);
  await expect(page.locator(".messages")).toBeEmpty();
  await page
    .locator("#history button")
    .filter({ hasText: "Build a little world" })
    .click();
  await expect(page.locator(".message.assistant")).toHaveText(
    "The finished answer.",
  );
  await expect(page.locator(".quest-delivery")).toHaveCount(0);
});
