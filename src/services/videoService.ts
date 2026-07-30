import { authHeaders } from "@/services/authHeadersService";
import { ApiError } from "@/services/apiClient";
import { handleUnauthorizedResponse } from "@/services/sessionGuardService";
import { ModuleVideo } from "@/types/types";

const BASE_URL = import.meta.env.VITE_API_URL;

export const videoService = {
  upload: async (
    moduleId: number,
    file: File,
    title: string,
  ): Promise<ModuleVideo> => {
    const headers = await authHeaders();
    const formData = new FormData();
    formData.append("video", file);
    formData.append("title", title);

    const res = await fetch(`${BASE_URL}/videos/modules/${moduleId}/videos`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!data.success) {
      await handleUnauthorizedResponse(res.status);
      throw new ApiError(res.status, data.message ?? "Upload failed.");
    }

    return {
      id: data.data.id,
      moduleId: data.data.module_id,
      title: data.data.title,
      filename: data.data.filename,
      durationSeconds: data.data.duration_seconds,
      sortOrder: data.data.sort_order,
    };
  },

  delete: async (videoId: number): Promise<void> => {
    const headers = await authHeaders();
    const res = await fetch(`${BASE_URL}/videos/${videoId}`, {
      // ← removed /api
      method: "DELETE",
      headers,
    });

    const data = await res.json();
    if (!data.success) {
      await handleUnauthorizedResponse(res.status);
      throw new ApiError(res.status, data.message ?? "Delete failed.");
    }
  },
};
