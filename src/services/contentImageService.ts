// src/services/contentImageService.ts
import { authHeaders } from "@/services/authHeadersService";
import { ApiError, toFriendlyError } from "@/services/apiClient";
import { handleUnauthorizedResponse } from "@/services/sessionGuardService";

const BASE_URL = import.meta.env.VITE_API_URL;

// Same limits as the server's /content-images upload route.
export const QUESTION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

// Returns the message to show for a file the upload would reject, or null.
export function questionImageError(file: File): string | null {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    return "Only JPEG, PNG, WebP, and GIF images are allowed.";
  }
  if (file.size > QUESTION_IMAGE_MAX_BYTES) {
    return "Image must be smaller than 5MB.";
  }
  return null;
}

export const contentImageService = {
  // Uploads an image and returns its stored path (/api/content-images/...).
  // FormData can't go through apiClient, so this follows fileService.
  upload: async (file: File): Promise<string> => {
    const headers = await authHeaders();
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`${BASE_URL}/content-images`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        await handleUnauthorizedResponse(res.status);
        throw new ApiError(res.status, data.message ?? "Upload failed.");
      }

      return data.data.url as string;
    } catch (err) {
      toFriendlyError(err);
    }
  },
};
