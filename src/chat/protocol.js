import { imageParts, storeImage, deleteImages } from "./media";
export function generationEndpoint(base) {
  const u = new URL(base);
  if (!["http:", "https:"].includes(u.protocol))
    throw Error("Invalid provider API URL.");
  return (
    base
      .replace(/\/+$/, "")
      .replace(/\/(?:chat\/completions|models|images\/generations)$/i, "") +
    "/images/generations"
  );
}
export async function chatPayload(
  provider,
  model,
  messages,
  { generate = false } = {},
) {
  const prepared = await Promise.all(
    messages.map(async (m) => ({
      role: m.role,
      text: String(m.content || ""),
      images: m.role === "user" ? await imageParts(m) : [],
    })),
  );
  if (provider === "gemini")
    return {
      contents: prepared.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [
          ...(m.text ? [{ text: m.text }] : []),
          ...m.images.map((i) => ({
            inlineData: { mimeType: i.mime, data: i.data },
          })),
        ],
      })),
      ...(generate
        ? { generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }
        : {}),
    };
  if (provider === "anthropic")
    return {
      model,
      max_tokens: 2048,
      messages: prepared.map((m) => ({
        role: m.role,
        content: m.images.length
          ? [
              ...(m.text ? [{ type: "text", text: m.text }] : []),
              ...m.images.map((i) => ({
                type: "image",
                source: { type: "base64", media_type: i.mime, data: i.data },
              })),
            ]
          : m.text,
      })),
    };
  return {
    model,
    messages: prepared.map((m) => ({
      role: m.role,
      content: m.images.length
        ? [
            ...(m.text ? [{ type: "text", text: m.text }] : []),
            ...m.images.map((i) => ({
              type: "image_url",
              image_url: { url: i.url },
            })),
          ]
        : m.text,
    })),
    ...(generate ? { modalities: ["image", "text"] } : {}),
  };
}
export async function readResponse(data, provider, { generate = false } = {}) {
  let text = "",
    urls = [];
  if (generate && ["openai", "custom", "omniroute"].includes(provider)) {
    for (const image of data.data || []) {
      if (image.b64_json) urls.push("data:image/png;base64," + image.b64_json);
      else if (image.url) urls.push(image.url);
    }
  } else if (provider === "gemini") {
    const parts = data.candidates?.[0]?.content?.parts || [];
    text = parts
      .map((p) => p.text || "")
      .join("\n")
      .trim();
    for (const p of parts) {
      const i = p.inlineData || p.inline_data;
      if (i?.data)
        urls.push(`data:${i.mimeType || i.mime_type};base64,${i.data}`);
    }
  } else if (provider === "anthropic") {
    text = (data.content || [])
      .filter((p) => p.type === "text")
      .map((p) => p.text || "")
      .join("\n")
      .trim();
  } else {
    const message = data.choices?.[0]?.message || {};
    const content = message.content;
    text =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content
              .filter((p) => p.type === "text" || p.type === "output_text")
              .map((p) => p.text || "")
              .join("\n")
          : "";
    for (const part of [
      ...(Array.isArray(content) ? content : []),
      ...(Array.isArray(message.images) ? message.images : []),
    ]) {
      const image = part.image_url;
      if (typeof image === "string") urls.push(image);
      else if (image?.url) urls.push(image.url);
    }
  }
  if (urls.length > 4)
    throw Error(
      "The provider returned too many images. Request at most four images.",
    );
  const attachments = [];
  // Validate/store one at a time: malformed provider data never becomes executable markup.
  try {
    for (const [i, url] of [...new Set(urls)].entries())
      attachments.push(await storeImage(url, `generated-${i + 1}.png`));
  } catch (error) {
    await deleteImages(attachments);
    throw error;
  }
  if (generate && !attachments.length && text.trim())
    text = "No image was returned by the provider.\n\n" + text;
  return { text, attachments };
}
