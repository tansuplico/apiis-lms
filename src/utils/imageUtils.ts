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

export function resolveProfilePicture(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  if (url.startsWith("/api/")) {
    return `${(import.meta.env.VITE_API_URL as string).replace("/api", "")}${url}`;
  }
  return url;
}

export function resolveThumbnailUrl(url: string | null | undefined): string {
  if (!url || url.trim() === "") return "/module-thumbnail.png";
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/api/")) {
    const base = (import.meta.env.VITE_API_URL as string).replace("/api", "");
    return `${base}${url}`;
  }
  if (url.startsWith("http")) return url;
  return "/module-thumbnail.png";
}
