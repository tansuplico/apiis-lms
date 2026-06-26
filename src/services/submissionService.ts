// src/services/submissionService.ts
import { tokenStorage } from "@/services/tokenStorage";

const BASE_URL = import.meta.env.VITE_API_URL;

async function authHeaders() {
  const token = await tokenStorage.getToken();
  return { Authorization: `Bearer ${token}` };
}

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

export interface StudentSubmission {
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
    const res = await fetch(
      `${BASE_URL}/submissions/modules/${moduleId}/settings`,
      { headers },
    );
    const data = await res.json();
    if (!data.success)
      throw new Error(data.message ?? "Failed to fetch settings.");
    return data.data;
  },

  updateSettings: async (
    moduleId: number,
    isActive: boolean,
    maxFiles: number,
  ): Promise<SubmissionSettings> => {
    const headers = await authHeaders();
    const res = await fetch(
      `${BASE_URL}/submissions/modules/${moduleId}/settings`,
      {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ isActive, maxFiles }),
      },
    );
    const data = await res.json();
    if (!data.success)
      throw new Error(data.message ?? "Failed to update settings.");
    return data.data;
  },

  // ── List (admin/facilitator)
  listSubmissions: async (moduleId: number): Promise<ModuleSubmission[]> => {
    const headers = await authHeaders();
    const res = await fetch(`${BASE_URL}/submissions/modules/${moduleId}`, {
      headers,
    });
    const data = await res.json();
    if (!data.success)
      throw new Error(data.message ?? "Failed to fetch submissions.");
    return data.data ?? [];
  },

  // ── My submissions (student)
  getMySubmissions: async (moduleId: number): Promise<MySubmissionsData> => {
    const headers = await authHeaders();
    const res = await fetch(
      `${BASE_URL}/submissions/modules/${moduleId}/mine`,
      { headers },
    );
    const data = await res.json();
    if (!data.success)
      throw new Error(data.message ?? "Failed to fetch submissions.");
    return data.data;
  },

  // ── Upload (student)
  upload: async (moduleId: number, file: File): Promise<StudentSubmission> => {
    const headers = await authHeaders();
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_URL}/submissions/modules/${moduleId}`, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message ?? "Upload failed.");
    return data.data;
  },

  // ── Delete (admin/facilitator)
  deleteSubmission: async (submissionId: number): Promise<void> => {
    const headers = await authHeaders();
    const res = await fetch(`${BASE_URL}/submissions/${submissionId}`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message ?? "Delete failed.");
  },

  // ── Download (all roles — ownership enforced server-side)
  download: async (
    submissionId: number,
    originalFilename: string,
  ): Promise<void> => {
    const headers = await authHeaders();
    const base = (BASE_URL as string).replace("/api", "");

    const res = await fetch(
      `${base}/api/submissions/${submissionId}/download`,
      { headers },
    );
    if (!res.ok) throw new Error("Download failed.");

    const blob = await res.blob();

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
