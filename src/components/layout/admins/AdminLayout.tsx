// src/components/layout/AdminLayout.tsx
import { ArrowLeft, ArrowRight, WifiOff } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useState, useEffect, useRef } from "react";
import AdminSidebar from "./AdminSidebar";
import { useAdminStore } from "@/stores/useAdminStore";
import {
  isOnline,
  onNetworkChange,
  startNetworkPolling,
} from "@/services/networkStatus";

export default function AdminLayout() {
  // ── Store
  const navigate = useNavigate();
  const location = useLocation();
  const admin = useAdminStore((state) => state.currentAdmin);

  // ── State: navigation history
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);
  const isPopNav = useRef(false);

  // ── State: online status
  const [online, setOnline] = useState(isOnline());

  // ── Effects: track location changes for forward/back
  useEffect(() => {
    if (isPopNav.current) {
      isPopNav.current = false;
      return;
    }
    setHistoryIndex((prev) => {
      const newIndex = prev + 1;
      setHistoryLength(newIndex);
      return newIndex;
    });
  }, [location.key]);

  // ── Effects: network status
  useEffect(() => {
    startNetworkPolling((nowOnline) => {
      setOnline(nowOnline);
    });

    const unsubscribe = onNetworkChange((nowOnline) => {
      setOnline(nowOnline);
    });

    return () => unsubscribe();
  }, []);

  // ── Derived
  const canGoBack = historyIndex > 1;
  const canGoForward = historyIndex < historyLength;

  // ── Render
  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      <AdminSidebar />

      <div className="flex-1 ml-64">
        <header className="fixed top-0 left-64 right-0 z-20 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                isPopNav.current = true;
                setHistoryIndex((prev) => prev - 1);
                navigate(-1);
              }}
              disabled={!canGoBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Go back"
            >
              <ArrowLeft size={18} />
            </button>

            <button
              onClick={() => {
                isPopNav.current = true;
                setHistoryIndex((prev) => prev + 1);
                navigate(1);
              }}
              disabled={!canGoForward}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Go forward"
            >
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-6">
            {!online && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium">
                <WifiOff size={15} />
                <span>Offline</span>
              </div>
            )}

            <button onClick={() => navigate("/admin/profile")}>
              {admin?.profilePicture ? (
                <img
                  className="w-10 h-10 rounded-full object-cover cursor-pointer border-2 border-gray-300 dark:border-gray-700 hover:border-blue-500 transition-all"
                  src={admin.profilePicture}
                  alt="User avatar"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-amber-400 to-orange-500 text-white font-bold text-sm flex items-center justify-center cursor-pointer border-2 border-gray-300 dark:border-gray-700">
                  {admin?.firstName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          </div>
        </header>

        <main className="pt-30 px-10 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          <Outlet />
        </main>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover
          theme="colored"
          limit={3}
        />
      </div>
    </div>
  );
}
