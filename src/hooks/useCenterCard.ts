// src/hooks/useCenterCard.ts
import { useCenterStore } from "@/stores/useCenterStore";
import { Center } from "@/types/types";
import { useOnlineStatus } from "./useOnlineStatus";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { tokenStorage } from "@/services/tokenStorage";

const BASE_URL = import.meta.env.VITE_API_URL as string;

export function useCenterCard(center: Center) {
  // ── Store & external state
  const { updateCenter } = useCenterStore();
  const online = useOnlineStatus();

  // ── Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ── Local state
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(center.title);
  const [renameSaving, setRenameSaving] = useState(false);

  // Tracks whether the thumbnail <img> has actually finished decoding, so
  // the card can show a pulse placeholder instead of letting coverColor
  // show through underneath an unloaded image (was previously untracked —
  // CenterGridCard/CenterListItem rendered the <img> with no loading state
  // at all).
  //
  // Initialize by checking the browser's own image cache synchronously
  // (new Image().complete is true instantly for already-cached images) so
  // a previously-seen thumbnail doesn't get a needless placeholder flash on
  // remount/navigate-back — only genuinely-uncached images show the pulse.
  // Matches the same fix applied to useCourseCard's thumbnailLoading.
  const resolvedThumbnailSrc = center.thumbnailUrl ?? "/module-thumbnail.png";

  const [imageLoaded, setImageLoaded] = useState(() => {
    if (typeof window === "undefined") return false;
    const probe = new Image();
    probe.src = resolvedThumbnailSrc;
    return probe.complete;
  });

  // Reset/recheck whenever the thumbnail URL actually changes (new upload,
  // or a different center's data swapped into this same card slot) — same
  // cache check, so a fresh image gets the placeholder while a previously
  // cached one doesn't.
  useEffect(() => {
    const probe = new Image();
    probe.src = resolvedThumbnailSrc;
    setImageLoaded(probe.complete);
  }, [resolvedThumbnailSrc]);

  const onImageLoad = () => {
    setImageLoaded(true);
  };

  // ── Handlers
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
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message ?? "Upload failed.");

      await updateCenter(center.id, { thumbnailUrl: json.data.url });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload image.", {
        position: "bottom-right",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openRename = () => {
    setRenameValue(center.title);
    setRenaming(true);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const cancelRename = () => {
    setRenaming(false);
    setRenameValue(center.title);
  };

  const confirmRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error("Center name cannot be empty.", { position: "bottom-right" });
      return;
    }
    if (trimmed === center.title) {
      setRenaming(false);
      return;
    }

    setRenameSaving(true);
    try {
      await updateCenter(center.id, { title: trimmed });
      setRenaming(false);
      toast.success("Center renamed.", { position: "bottom-right" });
    } catch {
      toast.error("Failed to rename center.", { position: "bottom-right" });
    } finally {
      setRenameSaving(false);
    }
  };

  // ── Return public API
  return {
    online,
    fileInputRef,
    renameInputRef,
    menuOpen,
    setMenuOpen,
    uploading,
    renaming,
    renameValue,
    setRenameValue,
    renameSaving,
    imageLoaded,
    onImageLoad,
    handleUpload,
    openRename,
    cancelRename,
    confirmRename,
  };
}
