import { tokenStorage } from "@/services/tokenStorage";
import { ModuleFile } from "@/types/types";

const BASE_URL = import.meta.env.VITE_API_URL;

async function authHeaders() {
  const token = await tokenStorage.getToken();
  return { Authorization: `Bearer ${token}` };
}

export const fileService = {
  upload: async (
    moduleId: number,
    file: File,
    title: string,
  ): Promise<ModuleFile> => {
    const headers = await authHeaders();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);

    const res = await fetch(`${BASE_URL}/files/modules/${moduleId}/files`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message ?? "Upload failed.");

    return {
      id: data.data.id,
      moduleId: data.data.module_id,
      title: data.data.title,
      originalFilename: data.data.original_filename,
      mimeType: data.data.mime_type,
      sortOrder: data.data.sort_order,
    };
  },

  delete: async (fileId: number): Promise<void> => {
    const headers = await authHeaders();
    const res = await fetch(`${BASE_URL}/files/${fileId}`, {
      method: "DELETE",
      headers,
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message ?? "Delete failed.");
  },

  download: async (fileId: number, originalFilename: string): Promise<void> => {
    const headers = await authHeaders();
    const base = (BASE_URL as string).replace(/\/api$/, "");

    const res = await fetch(`${base}/api/files/${fileId}/download`, {
      headers,
    });
    if (!res.ok) throw new Error("Download failed.");

    const blob = await res.blob();

    // ── Use OS save dialog if supported (Chrome/Edge)
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
        // User cancelled the dialog — don't fall through to auto-download
        if (err.name === "AbortError") return;
      }
    }

    // ── Fallback for Firefox/Safari — auto-downloads to default folder
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
