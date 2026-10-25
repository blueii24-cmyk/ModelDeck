import { importImage, readImage, deleteImages } from "./media";
export function setupAttachments({ notice }) {
  const input = document.getElementById("imageFiles"),
    tray = document.getElementById("attachmentTray"),
    composer = document.getElementById("form");
  let draft = [],
    pending = 0,
    revision = 0;
  function render() {
    tray.replaceChildren();
    tray.hidden = !draft.length && !pending;
    for (const ref of draft) {
      const item = document.createElement("div");
      item.className = "attachment-chip";
      const img = document.createElement("img");
      img.alt = ref.name;
      readImage(ref).then((url) => {
        if (url) img.src = url;
      });
      const name = document.createElement("span");
      name.textContent = ref.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove " + ref.name);
      remove.onclick = () => {
        draft = draft.filter((i) => i.id !== ref.id);
        void deleteImages([ref]);
        render();
      };
      item.append(img, name, remove);
      tray.append(item);
    }
    if (pending) {
      const text = document.createElement("span");
      text.textContent = "Reading images…";
      tray.append(text);
    }
  }
  async function add(files) {
    if (document.getElementById("send").disabled) {
      notice("Wait for the current response before attaching images.");
      return;
    }
    const token = revision;
    for (const file of files) {
      if (token !== revision) break;
      if (draft.length + pending >= 4) {
        notice("Attach up to four images per message.");
        break;
      }
      pending++;
      render();
      try {
        const ref = await importImage(file);
        if (token !== revision) {
          void deleteImages([ref]);
          continue;
        }
        draft.push(ref);
        if (ref.sessionOnly)
          notice(
            "Browser image storage is unavailable. This image will only last for this session.",
          );
      } catch (e) {
        notice(e.message);
      } finally {
        if (token === revision) {
          pending--;
          render();
        }
      }
    }
  }
  input.onchange = () => {
    void add([...input.files]);
    input.value = "";
  };
  document.getElementById("attachImages").onclick = () => input.click();
  composer.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.files || [])].filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length) {
      e.preventDefault();
      void add(files);
    }
  });
  composer.addEventListener("dragover", (e) => {
    if ([...e.dataTransfer.types].includes("Files")) e.preventDefault();
  });
  composer.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) {
      e.preventDefault();
      void add([...e.dataTransfer.files]);
    }
  });
  return {
    get() {
      if (pending)
        throw Error("Please wait for image attachments to finish loading.");
      return [...draft];
    },
    clear(discard = true) {
      revision++;
      pending = 0;
      if (discard) void deleteImages(draft);
      draft = [];
      render();
    },
  };
}
