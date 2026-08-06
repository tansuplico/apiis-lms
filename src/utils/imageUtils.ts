import { isOnline } from "@/services/networkStatus";

// src/utils/imageUtils.ts — replace toBase64() entirely
export async function toBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(
        `toBase64: HTTP ${res.status} ${res.statusText} for ${url}`,
      );
      return "";
    }
    const blob = await res.blob();
    if (blob.size === 0) {
      console.error(`toBase64: empty blob for ${url}`);
      return "";
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => {
        console.error(`toBase64: FileReader failed for ${url}`, reader.error);
        resolve("");
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error(`toBase64: fetch threw for ${url}`, err);
    return "";
  }
}

// src/utils/imageUtils.ts — append at the end of the file
export async function fileToCompressedDataUrl(
  file: File,
  maxDimension = 1000,
  quality = 0.75,
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read the image file."));
      el.src = objectUrl;
    });

    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/webp", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function resolveApiUrl(url: string): string {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const base = (import.meta.env.VITE_API_URL as string).replace(/\/api$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

export interface EmbedContentImagesResult {
  html: string;
  hadFailures: boolean;
}

export async function embedContentImages(
  html: string,
): Promise<EmbedContentImagesResult> {
  if (!html || !html.includes("<img")) {
    return { html, hadFailures: false };
  }
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const images = Array.from(doc.querySelectorAll("img"));
    let hadFailures = false;
    for (const img of images) {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) continue;
      try {
        const base64 = await toBase64(resolveApiUrl(src));
        if (base64) {
          img.setAttribute("src", base64);
        } else {
          hadFailures = true;
          console.error(
            `embedContentImages: toBase64 returned empty for ${src}`,
          );
        }
      } catch (imgErr) {
        hadFailures = true;
        console.error(`embedContentImages: failed to embed ${src}`, imgErr);
      }
    }
    return { html: doc.body.innerHTML, hadFailures };
  } catch (err) {
    console.error("embedContentImages: threw, returning original html", err);
    return { html, hadFailures: true };
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

export function imageFallbackSrc(): string {
  return isOnline() ? "/module-thumbnail.png" : "/no-internet.png";
}
