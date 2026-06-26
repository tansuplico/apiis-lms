// src/components/shared/CenterGridCard.tsx
import {
  BookOpen,
  Users,
  MoreVertical,
  ImageIcon,
  Loader2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Center } from "@/types/types";
import { useCenterCard } from "@/hooks/useCenterCard";

const CENTER_ROUTES: Record<string, string> = {
  admin: "/admin/centers",
  facilitator: "/facilitator/centers",
  student: "/student/centers",
};

export default function CenterGridCard({
  center,
  role,
}: {
  center: Center;
  role: "admin" | "facilitator" | "student";
}) {
  // ── Hooks & derived
  const navigate = useNavigate();
  const isReadOnly = role === "student";

  const {
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
  } = useCenterCard(center);

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl overflow-hidden flex flex-col h-full border border-gray-200 dark:border-gray-700">
      {/* Thumbnail */}
      <div
        className="relative h-48 w-full overflow-hidden"
        style={{ backgroundColor: center.coverColor }}
      >
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <Loader2 size={28} className="animate-spin text-white" />
          </div>
        )}

        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        )}

        <img
          src={center.thumbnailUrl ?? "/module-thumbnail.png"}
          alt={`${center.title} thumbnail`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onLoad={onImageLoad}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.dataset.errored) {
              img.dataset.errored = "1";
              img.src = "/module-thumbnail.png";
            } else {
              // Fallback image itself errored or already swapped in —
              // still counts as "settled" so the pulse placeholder clears.
              onImageLoad();
            }
          }}
        />

        {!isReadOnly && (
          <div className="absolute top-3 right-3 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (online) setMenuOpen((prev) => !prev);
              }}
              disabled={!online}
              title={!online ? "You're offline" : "Options"}
              className={`w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white transition-colors ${
                online
                  ? "hover:bg-black/60 cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              }`}
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-9 z-20 w-44 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                  >
                    <ImageIcon size={15} />
                    Change Image
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      openRename();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                  >
                    <Pencil size={15} />
                    Rename
                  </button>
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-5 flex flex-col gap-4 grow">
        {renaming ? (
          <div className="flex items-center gap-2">
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              maxLength={60}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRename();
                if (e.key === "Escape") cancelRename();
              }}
              className="flex-1 text-lg font-semibold bg-gray-50 dark:bg-gray-900 border border-blue-400 dark:border-blue-500 rounded-lg px-3 py-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={confirmRename}
              disabled={renameSaving}
              className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 cursor-pointer transition-colors"
              title="Confirm"
            >
              {renameSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
            </button>
            <button
              onClick={cancelRename}
              disabled={renameSaving}
              className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 disabled:opacity-50 cursor-pointer transition-colors"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <h4 className="text-xl font-semibold text-gray-900 dark:text-white line-clamp-2">
            {center.title}
          </h4>
        )}

        <div className="flex flex-col gap-2.5 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2.5">
            <BookOpen size={18} className="text-gray-500 dark:text-gray-400" />
            <span>{center.courses?.length ?? 0} Courses</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Users size={18} className="text-gray-500 dark:text-gray-400" />
            <span>{center.students?.length ?? 0} Students Enrolled</span>
          </div>
        </div>

        <button
          onClick={() => navigate(`${CENTER_ROUTES[role]}/${center.id}/view`)}
          className="mt-auto w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 cursor-pointer"
        >
          Open Center
        </button>
      </div>
    </div>
  );
}
