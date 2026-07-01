import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export default function UpdateNotifier() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    check()
      .then((result) => {
        if (result?.available) {
          setUpdate(result);
        }
      })
      .catch((err) => {
        console.error("Update check failed:", err);
      });
  }, []);

  if (!update) return null;

  const handleUpdate = async () => {
    setDownloading(true);
    let downloaded = 0;
    let contentLength = 0;

    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case "Finished":
            setProgress(100);
            break;
        }
      });
      await relaunch();
    } catch (err) {
      console.error("Update install failed:", err);
      setDownloading(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <span className="text-sm font-medium">
        {downloading
          ? `Downloading update... ${progress}%`
          : `A new version (${update.version}) is available.`}
      </span>
      {!downloading && (
        <button
          onClick={handleUpdate}
          className="bg-white text-blue-600 px-4 py-1.5 rounded text-sm font-semibold hover:bg-blue-50 transition-colors"
        >
          Update Now
        </button>
      )}
    </div>
  );
}
