// src/components/shared/SettingsModal.tsx
import { useState } from "react";
import { X, Sun, Moon, Palette, LifeBuoy } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import TicketForm from "@/components/shared/TicketForm";

interface SettingsModalProps {
  onClose: () => void;
  restrictTicketOffline?: boolean;
}

export default function SettingsModal({
  onClose,
  restrictTicketOffline = false,
}: SettingsModalProps) {
  // ── Theme
  const { theme, setTheme } = useTheme();

  // ── State: active tab
  const [activeTab, setActiveTab] = useState<"theme" | "help">("theme");

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-99 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
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

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("theme")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "theme"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <Palette size={16} />
            Theme
          </button>
          <button
            onClick={() => setActiveTab("help")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "help"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <LifeBuoy size={16} />
            Help
          </button>
        </div>

        {/* Theme tab */}
        {activeTab === "theme" && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Appearance
            </h3>
            <div className="grid grid-cols-2 gap-6">
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
        )}

        {/* Help tab */}
        {activeTab === "help" && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Submit a Support Ticket
            </h3>
            <TicketForm restrictOffline={restrictTicketOffline} />
          </div>
        )}

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
