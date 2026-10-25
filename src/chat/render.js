import { Marked } from "marked";
const escape = (s) =>
  String(s || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const marked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    image({ href, text }) {
      return `<a href="${escape(href)}">Image: ${escape(text || "open link")}</a>`;
    },
  },
});
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";
import { readImage } from "./media";
export function renderMarkdown(container, text) {
  const body = document.createElement("div");
  body.className = "markdown-body";
  body.innerHTML = DOMPurify.sanitize(
    marked.parse(String(text || ""), { gfm: true, breaks: true }),
    {
      FORBID_TAGS: [
        "img",
        "svg",
        "math",
        "style",
        "iframe",
        "object",
        "embed",
        "form",
        "input",
        "button",
        "video",
        "audio",
      ],
      FORBID_ATTR: ["style", "id", "name"],
      ALLOW_DATA_ATTR: false,
    },
  );
  for (const a of body.querySelectorAll("a")) {
    if (!/^(https?:|mailto:)/i.test(a.getAttribute("href") || ""))
      a.removeAttribute("href");
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  for (const code of body.querySelectorAll("pre > code")) {
    const raw = code.textContent;
    const language =
      [...code.classList].find((c) => c.startsWith("language-"))?.slice(9) ||
      "text";
    if (raw.length < 100000 && hljs.getLanguage(language)) {
      code.innerHTML = hljs.highlight(raw, {
        language,
        ignoreIllegals: true,
      }).value;
      code.classList.add("hljs");
    }
    const pre = code.parentElement,
      block = document.createElement("div");
    block.className = "code-block";
    pre.replaceWith(block);
    const bar = document.createElement("div");
    bar.className = "code-toolbar";
    const label = document.createElement("span");
    label.textContent = language;
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy code";
    copy.setAttribute("aria-label", `Copy ${language} code`);
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(raw);
        copy.textContent = "Copied!";
      } catch {
        const selection = window.getSelection(),
          range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        copy.textContent = "Selected — copy manually";
      }
    };
    copy.onblur = () => (copy.textContent = "Copy code");
    bar.append(label, copy);
    block.append(bar, pre);
  }
  for (const table of body.querySelectorAll("table")) {
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    table.replaceWith(wrap);
    wrap.append(table);
  }
  container.append(body);
}
export function renderImages(container, attachments) {
  if (!attachments?.length) return;
  const gallery = document.createElement("div");
  gallery.className = "message-images";
  container.append(gallery);
  for (const ref of attachments) {
    const figure = document.createElement("figure"),
      status = document.createElement("figcaption");
    status.textContent = "Loading image…";
    figure.append(status);
    gallery.append(figure);
    readImage(ref)
      .then((url) => {
        if (!url) {
          status.textContent =
            "Image unavailable in this browser. Reattach it or restore browser storage.";
          return;
        }
        const img = document.createElement("img");
        img.alt = ref.name || "Image";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.src = url;
        img.onerror = () => {
          status.textContent =
            "Image could not load. The provider URL may have expired.";
          img.remove();
        };
        const link = document.createElement("a");
        link.textContent = url.startsWith("data:")
          ? "Download image"
          : "Open image";
        link.href = url;
        link.referrerPolicy = "no-referrer";
        link.rel = "noopener noreferrer";
        link.target = "_blank";
        if (url.startsWith("data:")) link.download = ref.name || "image.png";
        status.textContent = ref.sessionOnly
          ? "Session only — download to keep. "
          : "";
        status.append(link);
        figure.prepend(img);
      })
      .catch(() => (status.textContent = "Image unavailable."));
  }
}
