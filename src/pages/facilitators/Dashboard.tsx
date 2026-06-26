// src/pages/facilitators/Dashboard.tsx
import { useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Users,
  ArrowRight,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";
import { useCenterStore } from "@/stores/useCenterStore";
import { useAttendanceStore } from "@/stores/useAttendanceStore";

export default function Dashboard() {
  // ── Store
  const navigate = useNavigate();
  const { centers } = useCenterStore();
  const {
    records,
    getAttendanceByFacilitator,
    isLoading: attendanceLoading,
  } = useAttendanceStore();
  const currentFacilitator = useFacilitatorStore((s) => s.currentFacilitator);

  // ── Derived: greeting
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  // ── Derived: assigned centers
  const myCenters = useMemo(
    () =>
      centers.filter(
        (c) => currentFacilitator?.assignedCenterIds.includes(c.id) ?? false,
      ),
    [centers, currentFacilitator],
  );

  const primaryCenter = myCenters[0] ?? null;

  // ── Effects: fetch attendance
  useEffect(() => {
    if (currentFacilitator) {
      getAttendanceByFacilitator().catch((err) => {
        toast.error("Failed to load attendance data.");
        console.error(err);
      });
    }
  }, [currentFacilitator, getAttendanceByFacilitator]);

  // ── Derived: recent attendance
  const recentAttendance = useMemo(() => {
    if (!primaryCenter || !records.length) return [];

    const grouped: Record<string, typeof records> = {};
    records.forEach((r) => {
      const dateKey = r.date?.split("T")[0] ?? "unknown";
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(r);
    });

    return Object.entries(grouped)
      .map(([date, recs]) => ({
        id: `${primaryCenter.id}-${date}`,
        centerId: primaryCenter.id,
        centerName: primaryCenter.title,
        date,
        records: recs,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [records, primaryCenter]);

  // ── Derived: totals
  const totalStudents = myCenters.reduce(
    (sum, c) => sum + (c.students?.length ?? 0),
    0,
  );
  const totalSessions = records.length;

  // ── Guard: not logged in
  if (!currentFacilitator) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  // ── Render
  return (
    <div className="space-y-10 pb-10 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Hero Greeting */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 rounded-2xl p-8 md:p-10 text-white shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {greeting}, Facilitator {currentFacilitator.firstName}!
        </h1>
        <p className="text-lg opacity-90">
          Here's a quick overview of your centers and students
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpen
                size={28}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Assigned Centers
              </p>
              <p className="text-2xl text-gray-900 dark:text-white">
                {myCenters.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <Users size={28} className="text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Students
              </p>
              <p className="text-3xl text-gray-900 dark:text-white">
                {totalStudents}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Calendar
                size={28}
                className="text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Attendance Sessions
              </p>
              <p className="text-3xl text-gray-900 dark:text-white">
                {totalSessions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* My Centers Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl text-gray-900 dark:text-white">My Centers</h2>
        </div>

        {myCenters.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-500 dark:text-gray-400">
            You are not assigned to any center yet.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Center Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCenters.map((center) => (
                <div
                  key={center.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 cursor-pointer"
                  onClick={() =>
                    navigate(`/facilitator/centers/${center.id}/view`)
                  }
                >
                  <div
                    className="relative h-48 w-full overflow-hidden"
                    style={{ backgroundColor: center.coverColor }}
                  >
                    <img
                      src={center.thumbnailUrl ?? "/module-thumbnail.png"}
                      alt={`${center.title} thumbnail`}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.errored) {
                          img.dataset.errored = "1";
                          img.src = "/module-thumbnail.png";
                        }
                      }}
                    />
                  </div>
                  <div className="px-6 py-5 flex flex-col gap-4 grow">
                    <h4 className="text-xl text-gray-900 dark:text-white">
                      {center.title}
                    </h4>
                    <div className="flex flex-col gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2.5">
                        <BookOpen
                          size={18}
                          className="text-gray-500 dark:text-gray-400"
                        />
                        <span>{center.courses.length} Courses</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Users
                          size={18}
                          className="text-gray-500 dark:text-gray-400"
                        />
                        <span>{center.students.length} Students Enrolled</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/facilitator/centers/${center.id}/view`);
                      }}
                      className="mt-auto w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      Open Center
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Attendance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar
                    size={20}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  Recent Attendance
                </h3>
                <Link
                  to="/facilitator/attendance"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  View All <ArrowRight size={16} />
                </Link>
              </div>

              {attendanceLoading ? (
                <div className="flex justify-center py-12 text-gray-500 dark:text-gray-400">
                  Loading attendance...
                </div>
              ) : recentAttendance.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 gap-3">
                  <Calendar size={36} className="opacity-30" />
                  <p>No attendance records yet.</p>
                  {primaryCenter && (
                    <button
                      onClick={() =>
                        navigate(
                          `/facilitator/centers/${primaryCenter.id}/view`,
                        )
                      }
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Go to center to record attendance
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentAttendance.map((session) => {
                    const present = session.records.filter(
                      (r) => r.status === "present",
                    ).length;
                    const total = session.records.length;
                    const presentPct =
                      total > 0 ? Math.round((present / total) * 100) : 0;

                    return (
                      <div
                        key={session.id}
                        onClick={() =>
                          navigate(`/facilitator/attendance/${session.id}`, {
                            state: {
                              records: session.records,
                              centerName: session.centerName,
                            },
                          })
                        }
                        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(session.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex flex-col items-end gap-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {presentPct}% attendance
                            </span>
                            <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${presentPct}%` }}
                              />
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
