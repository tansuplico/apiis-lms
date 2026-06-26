// src/pages/admin/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  GraduationCap,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { useAdminStore } from "@/stores/useAdminStore";
import { useCenterStore } from "@/stores/useCenterStore";
import { useFacilitatorListStore } from "@/stores/useFacilitatorListStore";
import { useStudentListStore } from "@/stores/useStudentListStore";
import { apiClient } from "@/services/apiClient";
import StatCard from "@/components/shared/StatCard";
import CentersOverviewTable from "@/components/admins/dashboard/CentersOverviewTable";

export default function AdminDashboard() {
  // ── Store
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const { facilitators } = useFacilitatorListStore();
  const { students } = useStudentListStore();
  const { centers } = useCenterStore();

  // ── State: ticket counts
  const [ticketStats, setTicketStats] = useState({ pending: 0, inProgress: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // ── Effects: fetch ticket stats on mount
  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const [openRes, inProgressRes] = await Promise.all([
          apiClient.get("/tickets?status=Open&limit=1"),
          apiClient.get("/tickets?status=In Progress&limit=1"),
        ]);
        if (!cancelled) {
          setTicketStats({
            pending: (openRes as any).pagination?.total ?? 0,
            inProgress: (inProgressRes as any).pagination?.total ?? 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch ticket stats", err);
      } finally {
        if (!cancelled) setIsLoadingStats(false);
      }
    };
    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived: dynamic greeting
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  // ── Render
  return (
    <div className="space-y-10 pb-12 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Hero Banner */}
      <div className="bg-linear-to-r from-indigo-600 to-purple-700 dark:from-indigo-800 dark:to-purple-900 rounded-2xl p-8 md:p-12 text-white shadow-xl">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-3">
          {greeting}, Admin {currentAdmin?.firstName}
        </h1>
        <p className="text-lg md:text-xl opacity-90 mb-6">
          Overview{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/admin/students"
            className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-medium backdrop-blur-sm transition-all"
          >
            <Users size={18} /> Manage Students
          </Link>
          <Link
            to="/admin/attendance"
            className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-medium backdrop-blur-sm transition-all"
          >
            <BarChart3 size={18} /> View Attendance
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={<BookOpen size={28} />}
          title="Total Centers"
          value={centers.length}
          color="blue"
        />
        <StatCard
          icon={<Users size={28} />}
          title="Total Students"
          value={students.length}
          color="green"
        />
        <StatCard
          icon={<GraduationCap size={28} />}
          title="Total Facilitators"
          value={facilitators.length}
          color="purple"
        />
      </div>

      {/* Centers Overview Table */}
      <CentersOverviewTable centers={centers} facilitators={facilitators} />

      {/* Quick Actions Panel */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoadingStats ? (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 animate-pulse h-32"></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 animate-pulse h-32"></div>
          </>
        ) : (
          <>
            <StatCard
              icon={<ShieldCheck size={28} />}
              title="Pending Tickets"
              value={ticketStats.pending}
              link="/admin/tickets"
              color="yellow"
            />
            <StatCard
              icon={<BarChart3 size={28} />}
              title="In Progress Tickets"
              value={ticketStats.inProgress}
              link="/admin/tickets"
              color="blue"
            />
          </>
        )}
      </section>
    </div>
  );
}
