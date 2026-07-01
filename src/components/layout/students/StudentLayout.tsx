// src/components/layout/StudentLayout.tsx
import { ArrowLeft, ArrowRight, Gem, WifiOff } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import StudentSidebar from "./StudentSidebar";
import { useStudentStore } from "@/stores/useStudentStore";
import { useEffect, useRef, useState } from "react";
import {
  isOnline,
  onNetworkChange,
  startNetworkPolling,
} from "@/services/networkStatus";
import { getLastSyncTime } from "@/services/syncService";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import UpdateNotifier from "@/components/shared/UpdateNotifier";

export default function StudentLayout() {
  // ── Hooks & Store
  useOfflineSync();
  const navigate = useNavigate();
  const { currentStudent } = useStudentStore();
  const location = useLocation();

  // ── State: navigation history
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);
  const isPopNav = useRef(false);

  // ── State: online status & sync time
  const [online, setOnline] = useState(isOnline());
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

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

  // ── Effects: redirect if not logged in
  useEffect(() => {
    if (!currentStudent) {
      navigate("/student/login");
    }
  }, [currentStudent, navigate]);

  // ── Effects: load last sync time
  useEffect(() => {
    getLastSyncTime().then(setLastSyncTime);
  }, []);

  // ── Effects: network status polling & events
  useEffect(() => {
    startNetworkPolling();
    const unsubscribe = onNetworkChange(setOnline);
    return () => unsubscribe();
  }, []);

  // ── Derived
  const canGoBack = historyIndex > 1;
  const canGoForward = historyIndex < historyLength;

  // ── Guard: null if not authenticated
  if (!currentStudent) return null;

  // ── Render
  return (
    <>
      <UpdateNotifier />
      <div className="flex min-h-screen bg-white dark:bg-gray-950">
        <StudentSidebar />
        <div className="flex-1 ml-64">
          <header className="fixed top-0 left-64 right-0 z-20 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 p-5">
            <div className="flex justify-between items-center">
              {/* Navigation buttons */}
              <div className="flex gap-4">
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

              {/* Right side */}
              <div className="flex items-center gap-5">
                {!online && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium">
                    <WifiOff size={15} />
                    <span>Offline, course content only</span>
                    {lastSyncTime && (
                      <span className="text-xs ml-1">
                        · Synced:{" "}
                        {new Date(lastSyncTime).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                )}

                {/* Coins */}
                <div className="py-2.5 px-3 flex items-center gap-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-800/50 cursor-pointer">
                  <Gem
                    size={20}
                    className="text-yellow-600 dark:text-yellow-400"
                    strokeWidth={1.75}
                  />
                  <span className="font-semibold text-sm dark:text-white">
                    {currentStudent?.coins ?? 0}
                  </span>
                </div>

                {/* Avatar */}
                <button onClick={() => navigate("/student/profile")}>
                  {currentStudent.profilePicture ? (
                    <img
                      className="w-10 h-10 rounded-full object-cover cursor-pointer"
                      src={currentStudent.profilePicture}
                      alt="User avatar"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white font-bold text-sm flex items-center justify-center cursor-pointer">
                      {currentStudent.firstName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              </div>
            </div>
          </header>

          <main className="pt-24 px-8">
            <Outlet />
          </main>
        </div>
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
        />{" "}
      </div>
    </>
  );
}
