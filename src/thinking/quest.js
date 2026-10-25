// Verifiable client-side milestones only. No clocks, estimates, or provider reasoning.
export const STAGES = [
  ["preparing", "Preparing your request"],
  ["sending", "Sending to the selected model"],
  ["waiting", "Waiting for the model's response"],
  ["receiving", "Receiving and displaying the answer"],
  ["complete", "Complete"],
];
export function createQuest(provider, model) {
  return {
    stage: "preparing",
    provider,
    model,
    reached: ["preparing"],
    collapsed: true,
  };
}
export function advanceQuest(quest, stage) {
  const order = [
    "preparing",
    "sending",
    "waiting",
    "receiving",
    "finishing",
    "complete",
  ];
  if (
    !order.includes(stage) ||
    ["error", "complete"].includes(quest.stage) ||
    order.indexOf(stage) <= order.indexOf(quest.stage)
  )
    return false;
  quest.stage = stage;
  quest.reached = [...new Set([...(quest.reached || []), stage])];
  return true;
}
export function failQuest(quest) {
  quest.failedStage = quest.stage === "finishing" ? "receiving" : quest.stage;
  quest.stage = "error";
  quest.collapsed = true;
}
export function stageDescription(stage, provider = "the selected provider") {
  return (
    {
      preparing:
        "Preparing your message and conversation context in this browser.",
      sending: `Handing the request to the browser to send to ${provider}.`,
      waiting:
        "Waiting for response headers. ModelDeck cannot see the remote model’s internal work.",
      receiving:
        "Response headers received. Reading the response body and checking its format.",
      finishing: "Response received and validated. Preparing it for display.",
      complete:
        "The answer is ready and has been handed to the conversation renderer.",
      error: "The request stopped. Check the error below before trying again.",
    }[stage] || "Request status unavailable."
  );
}
export function stageState(quest, id) {
  const current = quest.stage === "finishing" ? "receiving" : quest.stage;
  if (current === "error" && quest.failedStage === id) return "failed";
  if (current === id) return id === "complete" ? "completed" : "active";
  return Array.isArray(quest.reached) && quest.reached.includes(id)
    ? "completed"
    : "pending";
}

// Original parcel courier + workshop, defined locally on a 320 × 96 pixel grid.
const scene = `<svg class="quest-scene" viewBox="0 0 320 96" shape-rendering="crispEdges" aria-hidden="true">
 <path class="world-wall" d="M0 0h320v96H0z"/><path class="world-floor" d="M0 73h320v23H0z"/>
 <path class="world-grid" d="M0 79h320v1H0zm0 12h320v1H0zM24 74h1v22h-1zm40 0h1v22h-1zm40 0h1v22h-1zm40 0h1v22h-1zm40 0h1v22h-1zm40 0h1v22h-1zm40 0h1v22h-1zm40 0h1v22h-1z"/>
 <g class="quest-board"><path class="world-frame" d="M12 10h45v29H12z"/><path class="world-paper" d="M16 14h37v21H16z"/><path class="world-ink" d="M21 18h4v4h-4zm8 0h19v2H29zm-8 8h4v4h-4zm8 0h13v2H29z"/></g>
 <path class="world-frame" d="M66 51h62v6H66zm5 6h4v20h-4zm49 0h4v20h-4z"/>
 <path class="world-metal" d="M81 23h35v25H81zM94 48h10v4H94z"/><path class="world-screen" d="M85 27h27v17H85z"/>
 <g class="quest-terminal"><path d="M89 31h13v2H89zm0 5h18v2H89zm0 5h5v2h-5z"/><path class="quest-cursor" d="M98 40h4v3h-4z"/></g>
 <path class="world-metal" d="M159 17h43v57h-43z"/><path class="world-frame" d="M163 21h35v12h-35zm0 16h35v12h-35zm0 16h35v12h-35z"/>
 <g class="quest-server-lights"><path d="M167 25h4v4h-4z"/><path d="M167 41h4v4h-4z"/><path d="M167 57h4v4h-4z"/></g><path class="world-grid" d="M177 25h16v2h-16zm0 16h16v2h-16zm0 16h16v2h-16z"/>
 <path class="world-frame" d="M228 55h72v7h-72zm4 7h5v15h-5zm59 0h5v15h-5z"/>
 <g class="quest-assembly"><path class="world-paper" d="M253 27h25l8 8v20h-33z"/><path class="world-ink" d="M258 34h14v2h-14zm0 6h22v2h-22zm0 6h17v2h-17z"/><path class="world-accent" d="M245 49h5v5h-5zm38-27h5v5h-5z"/></g>
 <path class="world-metal" d="M116 79h130v6H116z"/><path class="quest-belt" d="M119 81h5v2h-5zm12 0h5v2h-5zm12 0h5v2h-5zm12 0h5v2h-5zm12 0h5v2h-5zm12 0h5v2h-5zm12 0h5v2h-5zm12 0h5v2h-5zm12 0h5v2h-5zm12 0h5v2h-5z"/>
 <g class="quest-parcel"><path class="world-accent" d="M119 67h13v11h-13z"/><path class="world-paper" d="M124 67h3v5h-3z"/></g>
 <g class="quest-worker"><path class="world-boots" d="M48 73h8v5h-8zm14 0h8v5h-8z"/><path class="world-accent" d="M46 53h25v21H46z"/><path class="world-paper" d="M49 40h19v17H49z"/><path class="world-accent" d="M47 37h23v7H47zm-3 7h7v3h-7z"/><path class="world-ink" d="M60 46h3v4h-3zm6 0h3v4h-3z"/><path class="quest-hands world-paper" d="M68 52h12v4H68z"/></g>
 <g class="quest-runner"><path class="world-sage" d="M210 58h14v14h-14zm2-9h10v9h-10z"/><path class="world-ink" d="M218 52h2v2h-2z"/><path class="world-boots" d="M210 72h5v4h-5zm9 0h5v4h-5z"/></g>
 <g class="quest-error-sign"><path d="M174 9h13v13h-13z"/><path class="world-paper" d="M179 11h3v6h-3zm0 8h3v2h-3z"/></g>
</svg>`;
let serial = 0;
export function createQuestView(message, onPreference = () => {}) {
  const card = document.createElement("section");
  card.className = "quest-world thinking-card";
  card.setAttribute("aria-label", "Request workshop");
  card.setAttribute("aria-live", "off");
  const logId = `quest-log-${++serial}`;
  card.innerHTML = `<div class="quest-hud"><strong>✳ QUEST IN PROGRESS</strong><button type="button" class="quest-toggle" aria-controls="${logId}">Quest log</button></div><div class="quest-model-line"><span class="quest-provider"></span><span> / </span><span class="thinking-model"></span></div><div class="quest-scene-wrap">${scene}<button type="button" class="quest-worker-action" aria-label="What is the worker doing?" aria-expanded="false"></button><span class="quest-task" hidden></span></div><p class="quest-caption" ></p><div class="quest-mini" aria-label="Quest checkpoints"></div><div id="${logId}" class="quest-log"><ol></ol><p class="quest-inspection" hidden></p><small>Frontend milestones, not private model thoughts.</small></div>`;
  const quest = () => message.quest;
  let inspected = null,
    lastStage = null;
  const list = card.querySelector("ol"),
    log = card.querySelector(".quest-log"),
    toggle = card.querySelector(".quest-toggle");
  for (const [id, label] of STAGES) {
    const row = document.createElement("li"),
      button = document.createElement("button");
    button.type = "button";
    button.dataset.step = id;
    button.innerHTML =
      '<span class="quest-step-icon" aria-hidden="true"></span><span class="quest-step-name"></span><span class="quest-step-state"></span>';
    button.querySelector(".quest-step-name").textContent = label;
    button.title = stageDescription(id, quest().provider);
    button.onclick = () => {
      inspected = id;
      const info = card.querySelector(".quest-inspection");
      info.hidden = false;
      info.textContent = stageDescription(id, quest().provider);
      update();
    };
    row.append(button);
    list.append(row);
  }
  for (const [index, [id, label]] of STAGES.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.step = id;
    button.innerHTML =
      '<span class="quest-step-icon" aria-hidden="true"></span><span>' +
      ["Prep", "Send", "Wait", "Read", "Done"][index] +
      "</span>";
    button.title = label;
    button.onclick = () => {
      quest().collapsed = false;
      list.querySelector(`[data-step="${id}"]`).click();
      onPreference();
    };
    card.querySelector(".quest-mini").append(button);
  }
  toggle.onclick = () => {
    quest().collapsed = !quest().collapsed;
    update();
    onPreference();
  };
  const worker = card.querySelector(".quest-worker-action"),
    task = card.querySelector(".quest-task");
  task.id = `quest-task-${serial}`;
  worker.setAttribute("aria-controls", task.id);
  worker.setAttribute("aria-describedby", task.id);
  worker.onclick = () => {
    task.hidden = !task.hidden;
    worker.setAttribute("aria-expanded", String(!task.hidden));
  };
  function update() {
    const q = quest();
    card.dataset.stage = q.stage;
    card.classList.toggle("thinking-card", q.stage !== "error");
    card.querySelector(".quest-hud strong").textContent =
      q.stage === "error"
        ? "! QUEST STOPPED"
        : q.stage === "complete"
          ? "✓ QUEST COMPLETE"
          : "✳ QUEST IN PROGRESS";
    card.querySelector(".quest-provider").textContent = q.provider;
    card.querySelector(".thinking-model").textContent = q.model;
    if (lastStage !== q.stage) {
      card.querySelector(".quest-caption").textContent = stageDescription(
        q.stage,
        q.provider,
      );
      lastStage = q.stage;
    }
    task.textContent = "Local worker: " + stageDescription(q.stage, q.provider);
    log.hidden = !!q.collapsed;
    toggle.setAttribute("aria-expanded", String(!q.collapsed));
    toggle.textContent = q.collapsed ? "Show quest log" : "Hide quest log";
    for (const button of card.querySelectorAll(".quest-mini button")) {
      const id = button.dataset.step,
        state = stageState(q, id);
      button.dataset.state = state;
      button.setAttribute(
        "aria-label",
        STAGES.find((s) => s[0] === id)[1] + ": " + state,
      );
      button.querySelector(".quest-step-icon").textContent = {
        pending: "▫",
        active: "▸",
        completed: "✓",
        failed: "!",
      }[state];
    }
    for (const button of list.querySelectorAll("button")) {
      const id = button.dataset.step,
        state = stageState(q, id);
      button.dataset.state = state;
      button.setAttribute("aria-pressed", String(inspected === id));
      button.querySelector(".quest-step-icon").textContent = {
        pending: "▫",
        active: "▸",
        completed: "✓",
        failed: "!",
      }[state];
      button.querySelector(".quest-step-state").textContent = state;
    }
  }
  update();
  return { card, update };
}
export function celebrateReply(node) {
  // No delay: the answer is already readable while its original document sprite arrives.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const sprite = document.createElement("span");
  sprite.className = "quest-delivery";
  sprite.setAttribute("aria-hidden", "true");
  sprite.innerHTML =
    '<svg viewBox="0 0 32 32" shape-rendering="crispEdges"><path fill="currentColor" d="M8 4h14l4 4v20H8z"/><path fill="var(--panel)" d="M12 10h10v2H12zm0 5h10v2H12zm0 5h7v2h-7z"/><path fill="var(--text)" d="M2 5h3v3H2zm25 13h3v3h-3z"/></svg>';
  sprite.addEventListener("animationend", () => sprite.remove(), {
    once: true,
  });
  node.append(sprite);
}
