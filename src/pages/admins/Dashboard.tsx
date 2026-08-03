// src/pages/admin/Dashboard.tsx
import { useEffect, useState } from "react";
import {
  BookOpen,
  Users,
  GraduationCap,
  BarChart3,
  ShieldCheck,
  Sparkles,
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

  // ── Effects: fetch ticket stats on mount
  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
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

  const HERO_GRADIENTS = [
    "from-indigo-600 to-purple-700 dark:from-indigo-800 dark:to-purple-900",
    "from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900",
    "from-violet-600 to-indigo-700 dark:from-violet-800 dark:to-indigo-900",
  ];
  const [heroGradient] = useState(
    () => HERO_GRADIENTS[Math.floor(Math.random() * HERO_GRADIENTS.length)],
  );

  // ── Render
  return (
    <div className="space-y-10 pb-12 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Hero Banner */}
      <div
        className={`relative rounded-3xl overflow-hidden bg-linear-to-r ${heroGradient}`}
      >
        <div className="px-8 pt-8 pb-12 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="opacity-90" strokeWidth={2} />
            <span className="text-sm font-semibold uppercase tracking-wide opacity-90">
              {greeting}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
            Hi, Admin {currentAdmin?.firstName}!
          </h1>
          <p className="text-base md:text-lg opacity-90">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Scalloped edge — matches the student dashboard's hero treatment */}
        <svg
          className="absolute bottom-0 left-0 w-full text-white dark:text-gray-950"
          style={{ height: "22px" }}
          viewBox="0 0 1200 22"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,22 L0,11 Q50,-3 100,11 T200,11 T300,11 T400,11 T500,11 T600,11 T700,11 T800,11 T900,11 T1000,11 T1100,11 T1200,11 L1200,22 Z"
          />
        </svg>
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
      </div>

      {/* Centers Overview Table */}
      <CentersOverviewTable centers={centers} facilitators={facilitators} />
    </div>
  );
}
