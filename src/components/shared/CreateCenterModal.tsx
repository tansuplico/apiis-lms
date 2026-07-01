// src/components/shared/CreateCenterModal.tsx
import React, { useRef, useState } from "react";
import { X, Upload, Loader2, ImageOff } from "lucide-react";
import { toast } from "react-toastify";
import { tokenStorage } from "@/services/tokenStorage";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useCenterStore } from "@/stores/useCenterStore";
import { resolveThumbnailUrl } from "@/utils/imageUtils";

const BASE_URL = (import.meta.env.VITE_API_URL as string).replace(/\/api$/, "");

const EMPTY_CENTER = {
  title: "",
  coverColor: "#3B82F6",
  thumbnailUrl: "",
  location: "",
  facilitatorIds: [] as number[],
};

interface CreateCenterModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCenterModal({
  onClose,
  onCreated,
}: CreateCenterModalProps) {
  // ── State & refs
  const [newCenter, setNewCenter] = useState(EMPTY_CENTER);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const online = useOnlineStatus();

  // ── Derived: thumbnail preview URL
  const previewSrc = resolveThumbnailUrl(newCenter.thumbnailUrl || null);

  // ── Handlers: form submission & thumbnail upload
  const handleCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await useCenterStore.getState().createCenter(newCenter);
      onCreated();
      onClose();
    } catch {
      // error surfaced by store
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = await tokenStorage.getToken();
      const formData = new FormData();
      formData.append("thumbnail", file);

      const res = await fetch(`${BASE_URL}/center-thumbnails`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message ?? "Upload failed.");

      setNewCenter({ ...newCenter, thumbnailUrl: json.data.url });
      toast.success("Image uploaded.", { position: "bottom-right" });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed.", {
        position: "bottom-right",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray">
        {" "}
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Create New Center
          </h2>
          <button
            onClick={onClose}
            className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <X size={32} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleCreateCenter} className="space-y-10">
          {/* Center Name */}
          <div className="space-y-3">
            <label
              htmlFor="title"
              className="block text-base font-medium text-gray-700 dark:text-gray-300"
            >
              Center Name <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={newCenter.title}
              onChange={(e) =>
                setNewCenter({ ...newCenter, title: e.target.value })
              }
              className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
              placeholder="e.g. Watawat Advanced"
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-3">
            <label
              htmlFor="location"
              className="block text-base font-medium text-gray-700 dark:text-gray-300"
            >
              Location
            </label>
            <input
              id="location"
              type="text"
              value={newCenter.location}
              onChange={(e) =>
                setNewCenter({ ...newCenter, location: e.target.value })
              }
              className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
              placeholder="e.g. Barangay Poblacion, Cebu City"
            />
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-4">
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300">
              Thumbnail{" "}
              <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">
                (optional)
              </span>
            </label>

            <div className="relative w-full max-w-xs aspect-video rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Center thumbnail"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/module-thumbnail.png";
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
                  <ImageOff size={28} />
                  <span className="text-xs">No image selected</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleUpload}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !online}
                className="flex items-center gap-2 px-5 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    {previewSrc ? "Replace image" : "Upload image"}
                  </>
                )}
              </button>
              {previewSrc && !uploading && (
                <button
                  type="button"
                  onClick={() =>
                    setNewCenter({ ...newCenter, thumbnailUrl: "" })
                  }
                  className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              JPEG, PNG, WebP or GIF · Max 10 MB
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-5 pt-8 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={uploading || !online}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 dark:bg-green-700 dark:hover:bg-green-600 disabled:dark:bg-green-800 text-white py-4 px-8 rounded-xl font-medium text-lg transition-all cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 shadow-md hover:shadow-lg"
            >
              Create Center
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-4 px-8 rounded-xl font-medium text-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
