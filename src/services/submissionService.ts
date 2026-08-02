// src/services/submissionService.ts
import { authHeaders } from "@/services/authHeadersService";
import { ApiError, toFriendlyError } from "@/services/apiClient";
import { handleUnauthorizedResponse } from "@/services/sessionGuardService";

const BASE_URL = import.meta.env.VITE_API_URL;

export interface SubmissionSettings {
  isActive: boolean;
  maxFiles: number;
}

export interface ModuleSubmission {
  id: number;
  studentId: number;
  studentName: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  submittedAt: string;
}

interface StudentSubmission {
  id: number;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  submittedAt: string;
}

export interface MySubmissionsData extends SubmissionSettings {
  submissions: StudentSubmission[];
}

export const submissionService = {
  // ── Settings (admin/facilitator)
  getSettings: async (moduleId: number): Promise<SubmissionSettings> => {
    const headers = await authHeaders();
    try {
      const res = await fetch(
        `${BASE_URL}/submissions/modules/${moduleId}/settings`,
        { headers },
      );
      const data = await res.json();
      if (!data.success) {
        await handleUnauthorizedResponse(res.status);
        throw new ApiError(
          res.status,
          data.message ?? "Failed to fetch settings.",
        );
      }
      return data.data;
    } catch (err) {
      toFriendlyError(err);
    }
  },

  updateSettings: async (
    moduleId: number,
    isActive: boolean,
    maxFiles: number,
  ): Promise<SubmissionSettings> => {
    const headers = await authHeaders();
    try {
      const res = await fetch(
        `${BASE_URL}/submissions/modules/${moduleId}/settings`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ isActive, maxFiles }),
        },
      );
      const data = await res.json();
      if (!data.success) {
        await handleUnauthorizedResponse(res.status);
        throw new ApiError(
          res.status,
          data.message ?? "Failed to update settings.",
        );
      }
      return data.data;
    } catch (err) {
      toFriendlyError(err);
    }
  },

  // ── List (admin/facilitator)
  listSubmissions: async (moduleId: number): Promise<ModuleSubmission[]> => {
    const headers = await authHeaders();
    try {
      const res = await fetch(`${BASE_URL}/submissions/modules/${moduleId}`, {
        headers,
      });
      const data = await res.json();
      if (!data.success) {
        await handleUnauthorizedResponse(res.status);
        throw new ApiError(
          res.status,
          data.message ?? "Failed to fetch submissions.",
        );
      }
      return data.data ?? [];
    } catch (err) {
      toFriendlyError(err);
    }
  },

  // ── My submissions (student)
  getMySubmissions: async (moduleId: number): Promise<MySubmissionsData> => {
    const headers = await authHeaders();
    try {
      const res = await fetch(
        `${BASE_URL}/submissions/modules/${moduleId}/mine`,
        { headers },
      );
      const data = await res.json();
      if (!data.success) {
        await handleUnauthorizedResponse(res.status);
        throw new ApiError(
          res.status,
          data.message ?? "Failed to fetch submissions.",
        );
      }
      return data.data;
    } catch (err) {
      toFriendlyError(err);
    }
  },

  // ── Upload (student)
  upload: async (moduleId: number, file: File): Promise<StudentSubmission> => {
    const headers = await authHeaders();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BASE_URL}/submissions/modules/${moduleId}`, {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!data.success) {
        await handleUnauthorizedResponse(res.status);
        throw new ApiError(res.status, data.message ?? "Upload failed.");
      }
      return data.data;
    } catch (err) {
      toFriendlyError(err);
    }
  },

  // ── Delete (admin/facilitator)
  deleteSubmission: async (submissionId: number): Promise<void> => {
    const headers = await authHeaders();
    try {
      const res = await fetch(`${BASE_URL}/submissions/${submissionId}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!data.success) {
        await handleUnauthorizedResponse(res.status);
        throw new ApiError(res.status, data.message ?? "Delete failed.");
      }
    } catch (err) {
      toFriendlyError(err);
    }
  },

  // ── Download (all roles — ownership enforced server-side)
  download: async (
    submissionId: number,
    originalFilename: string,
  ): Promise<void> => {
    const headers = await authHeaders();
    const base = (BASE_URL as string).replace(/\/api$/, "");

    let blob: Blob;
    try {
      const res = await fetch(
        `${base}/api/submissions/${submissionId}/download`,
        { headers },
      );
      if (!res.ok) {
        await handleUnauthorizedResponse(res.status);
        throw new ApiError(res.status, "Download failed.");
      }
      blob = await res.blob();
    } catch (err) {
      toFriendlyError(err);
      return; // unreachable — toFriendlyError always throws — keeps TS happy
    }

    if ("showSaveFilePicker" in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: originalFilename,
          types: [{ description: "File", accept: { "*/*": [] } }],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = originalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
