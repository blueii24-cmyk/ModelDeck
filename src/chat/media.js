// Images live separately from API keys/chat JSON to avoid localStorage size limits.
const cache = new Map();
let database;
function db() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open("modeldeck-media-v1", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("images", { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  return database;
}
async function transaction(mode, action) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("images", mode);
    const req = action(tx.objectStore("images"));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export function safeImageUrl(value) {
  if (typeof value !== "string") return null;
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\r\n]+$/i.test(value))
    return value;
  try {
    const u = new URL(value);
    if (u.protocol === "https:" && !u.username && !u.password) return u.href;
  } catch {}
  return null;
}
function sniff(bytes) {
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71)
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (String.fromCharCode(...bytes.slice(0, 6)).match(/^GIF8[79]a$/))
    return "image/gif";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
export function parseImageData(url, maxBytes = 10 * 1024 * 1024) {
  if (!safeImageUrl(url) || !url.startsWith("data:"))
    throw Error("Only PNG, JPEG, WebP or GIF image data is supported.");
  const [header, data] = url.split(",");
  if (data.length > Math.ceil(maxBytes / 3) * 4 + 4)
    throw Error("Image is too large.");
  let decoded;
  try {
    decoded = atob(data);
  } catch {
    throw Error("The provider returned invalid image data.");
  }
  const mime = header.slice(5, header.indexOf(";"));
  const actual = sniff(
    Uint8Array.from(decoded.slice(0, 12), (c) => c.charCodeAt(0)),
  );
  if (!actual || actual !== mime.toLowerCase())
    throw Error(
      "Image content does not match its format. SVG and HTML are not supported.",
    );
  return { mime: actual, data };
}
export async function storeImage(url, name = "image.png") {
  const safe = safeImageUrl(url);
  if (!safe)
    throw Error("The provider returned an unsupported or unsafe image URL.");
  if (!safe.startsWith("data:")) return { url: safe, name };
  const { mime } = parseImageData(safe);
  const record = { id: crypto.randomUUID(), url: safe, mime, name };
  cache.set(record.id, record);
  try {
    await transaction("readwrite", (store) => store.put(record));
    return { id: record.id, mime, name };
  } catch {
    return { id: record.id, mime, name, sessionOnly: true };
  }
}
export async function readImage(ref) {
  if (ref.url) return safeImageUrl(ref.url);
  if (cache.has(ref.id)) return cache.get(ref.id).url;
  try {
    const record = await transaction("readonly", (s) => s.get(ref.id));
    if (record) {
      cache.set(ref.id, record);
      return safeImageUrl(record.url);
    }
  } catch {}
  return null;
}
export async function deleteImages(refs) {
  for (const ref of refs || []) {
    if (!ref.id) continue;
    cache.delete(ref.id);
    try {
      await transaction("readwrite", (s) => s.delete(ref.id));
    } catch {}
  }
}
export async function importImage(file) {
  if (file.size > 2 * 1024 * 1024)
    throw Error("Each attachment must be 2 MB or smaller.");
  if (
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)
  )
    throw Error("Choose a PNG, JPEG, WebP or GIF image. SVG is not supported.");
  const url = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(Error("Could not read the image."));
    r.readAsDataURL(file);
  });
  parseImageData(url, 2 * 1024 * 1024);
  return storeImage(url, file.name);
}
export async function imageParts(message) {
  return Promise.all(
    (message.attachments || []).map(async (ref) => {
      const url = await readImage(ref);
      if (!url)
        throw Error(
          "An image from this conversation is unavailable in browser storage. Reattach it in a new chat.",
        );
      return { url, ...parseImageData(url) };
    }),
  );
}
