// src/components/layout/AdminSidebar.tsx
import {
  LayoutDashboard,
  BookText,
  GraduationCap,
  Settings,
  Users,
  MessageSquare,
  UserCog,
  Rows4,
  Store,
  Library,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useMemo, useState } from "react";
import SettingsModal from "@/components/shared/SettingsModal";
import { useTicketStore } from "@/stores/useTicketStore";
import logo from "@/assets/logo.png";

export default function AdminSidebar() {
  // ── State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // ── Unseen tickets: any ticket created after the admin last opened the
  // Tickets page counts as "new". Capped visually at 9+.
  const tickets = useTicketStore((s) => s.tickets);
  const lastViewedAt = useTicketStore((s) => s.lastViewedAt);
  const newTicketCount = useMemo(
    () =>
      tickets.filter((t) => new Date(t.createdAt).getTime() > lastViewedAt)
        .length,
    [tickets, lastViewedAt],
  );

  // ── Render
  return (
    <>
      <aside className="w-64 h-screen bg-gray-50 dark:bg-gray-950 flex flex-col border-r border-gray-200 dark:border-gray-800 fixed top-0 left-0 z-10">
        {/* Brand */}
        <div className="px-6 pt-8 pb-6 flex justify-center items-center">
          <img src={logo} className="w-32 " />
        </div>

        {/* Main navigation */}
        <nav className="flex-1 px-3">
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg text-base font-medium ${
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
                to="/admin/courses"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg text-base font-medium ${
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
                to="/admin/centers"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg text-base font-medium ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <GraduationCap
                  size={26}
                  strokeWidth={1.6}
                  className="text-gray-600 dark:text-gray-400"
                />
                <span>Centers</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/facilitators"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg text-base font-medium ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <UserCog
                  size={26}
                  strokeWidth={1.6}
                  className="text-gray-600 dark:text-gray-400"
                />
                <span>Facilitators</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/students"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg text-base font-medium ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <Users
                  size={26}
                  strokeWidth={1.6}
                  className="text-gray-600 dark:text-gray-400"
                />
                <span>Students</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/tickets"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg text-base font-medium ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <span className="relative shrink-0">
                  <MessageSquare
                    size={26}
                    strokeWidth={1.6}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  {newTicketCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none ring-2 ring-gray-50 dark:ring-gray-950"
                      aria-label={`${newTicketCount} new ticket${newTicketCount === 1 ? "" : "s"}`}
                    >
                      {newTicketCount > 9 ? "9+" : newTicketCount}
                    </span>
                  )}
                </span>
                <span>Tickets</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/attendance"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg transition-colors text-base font-medium ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <Rows4
                  size={26}
                  strokeWidth={1.6}
                  className="text-gray-600 dark:text-gray-400"
                />
                <span>Attendance</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/shop"
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
            <li>
              <NavLink
                to="/admin/question-bank"
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-lg text-base font-medium ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <Library
                  size={26}
                  strokeWidth={1.6}
                  className="text-gray-600 dark:text-gray-400"
                />
                <span>Question Bank</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-6 mt-auto border-t border-gray-200 dark:border-gray-700 pt-4">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-full flex items-center gap-4 px-5 py-3.5 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Settings
                  size={26}
                  strokeWidth={1.6}
                  className="text-gray-600 dark:text-gray-400"
                />
                <span>Settings</span>
              </button>
            </li>
          </ul>
        </div>
      </aside>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
      )}
    </>
  );
}
