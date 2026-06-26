// src/components/admin/course/VideoPreviewModal.tsx
import { Video, X } from "lucide-react";
import { useVideoStream } from "../../../hooks/useVideoStream";

interface VideoPreviewModalProps {
  video: { id: number; title: string } | null;
  onClose: () => void;
}

export default function VideoPreviewModal({
  video,
  onClose,
}: VideoPreviewModalProps) {
  // ── Hooks: video stream
  const { streamUrl, error, loading } = useVideoStream(video?.id ?? null);

  // ── Guard: no video selected
  if (!video) return null;

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-md">
              {video.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-black aspect-video flex items-center justify-center">
          {loading && <p className="text-white text-sm">Loading video...</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {streamUrl && (
            <video
              key={streamUrl}
              controls
              autoPlay
              className="w-full h-full"
              src={streamUrl}
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </div>
    </div>
  );
}
