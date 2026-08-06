export async function toBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

export function resolveApiUrl(url: string): string {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const base = (import.meta.env.VITE_API_URL as string).replace(/\/api$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

export async function embedContentImages(html: string): Promise<string> {
  if (!html || !html.includes("<img")) return html;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const images = Array.from(doc.querySelectorAll("img"));
    for (const img of images) {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) continue;
      const base64 = await toBase64(resolveApiUrl(src));
      if (base64) img.setAttribute("src", base64);
    }
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

export function resolveProfilePicture(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  if (url.startsWith("/api/")) {
    return `${(import.meta.env.VITE_API_URL as string).replace(/\/api$/, "")}${url}`;
  }
  return url;
}

export function resolveThumbnailUrl(url: string | null | undefined): string {
  if (!url || url.trim() === "") return "/module-thumbnail.png";
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/api/")) {
    const base = (import.meta.env.VITE_API_URL as string).replace(/\/api$/, "");
    return `${base}${url}`;
  }
  if (url.startsWith("http")) return url;
  return "/module-thumbnail.png";
}
