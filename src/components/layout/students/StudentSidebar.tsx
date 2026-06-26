// src/components/layout/StudentSidebar.tsx
import {
  LayoutDashboard,
  BookText,
  Store,
  Palette,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";

export default function StudentSidebar() {
  // ── State
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved as "light" | "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ── Handlers
  const openThemeModal = () => setIsThemeModalOpen(true);
  const closeThemeModal = () => setIsThemeModalOpen(false);

  // ── Render
  return (
    <>
      <aside className="w-64 h-screen bg-gray-50 dark:bg-gray-950 flex flex-col border-r border-gray-200 dark:border-gray-800 fixed top-0 left-0 z-10">
        {/* Brand */}
        <div className="px-6 pt-8 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight text-center">
            APIIS
          </h1>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 px-3">
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/student/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg transition-colors text-base font-medium ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <LayoutDashboard
                  size={26}
                  strokeWidth={1.6}
                  className="text-gray-600 dark:text-gray-400"
                />
                <span>Dashboard</span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/student/courses"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg transition-colors text-base font-medium ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <BookText
                  size={26}
                  strokeWidth={1.6}
                  className="text-gray-600 dark:text-gray-400"
                />
                <span>Courses</span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/student/shop"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg transition-colors text-base font-medium ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <Store
                  size={26}
                  strokeWidth={1.6}
                  className="text-gray-600 dark:text-gray-400"
                />
                <span>Shop</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-6 mt-auto border-t border-gray-200 dark:border-gray-700 pt-4">
          <ul className="space-y-1">
            {/* Theme button */}
            <li>
              <button
                onClick={openThemeModal}
                className="w-full flex items-center gap-4 px-5 py-3.5 rounded-lg transition-colors text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Palette
                  size={26}
                  strokeWidth={1.6}
                  className="text-gray-600 dark:text-gray-400"
                />
                <span>Theme</span>
                {/* Current theme indicator */}
                {theme === "dark" ? (
                  <Moon size={16} className="ml-auto text-indigo-400" />
                ) : (
                  <Sun size={16} className="ml-auto text-yellow-500" />
                )}
              </button>
            </li>

            <li>
              <NavLink
                to="/student/profile"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg transition-colors text-base font-medium ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <Settings
                  size={26}
                  strokeWidth={1.6}
                  className="text-gray-600 dark:text-gray-400"
                />
                <span>Settings</span>
              </NavLink>
            </li>
          </ul>
        </div>
      </aside>

      {/* Theme Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-300">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">
              Choose Theme
            </h2>

            <div className="grid grid-cols-2 gap-6">
              {/* Light Mode */}
              <button
                onClick={() => {
                  setTheme("light");
                  closeThemeModal();
                }}
                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
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

              {/* Dark Mode */}
              <button
                onClick={() => {
                  setTheme("dark");
                  closeThemeModal();
                }}
                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
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

            <button
              onClick={closeThemeModal}
              className="mt-8 w-full py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors text-gray-900 dark:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
