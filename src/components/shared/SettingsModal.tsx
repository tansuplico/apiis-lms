// src/components/shared/SettingsModal.tsx
import { X, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  // ── Theme
  const { theme, setTheme } = useTheme();

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Theme */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Theme
          </h3>
          <div className="grid grid-cols-2 gap-6">
            {/* Light Mode card */}
            <button
              onClick={() => setTheme("light")}
              className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 ${
                theme === "light"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-400"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
              }`}
            >
              <Sun size={40} className="text-yellow-500" />
              <span className="text-lg font-medium text-gray-900 dark:text-white">
                Light
              </span>
            </button>

            {/* Dark Mode card */}
            <button
              onClick={() => setTheme("dark")}
              className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 ${
                theme === "dark"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-400"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
              }`}
            >
              <Moon size={40} className="text-indigo-500" />
              <span className="text-lg font-medium text-gray-900 dark:text-white">
                Dark
              </span>
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-8 w-full py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium text-gray-900 dark:text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
