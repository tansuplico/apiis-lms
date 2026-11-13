// src/App.tsx
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./App.css";

import { useEffect, useState } from "react";
import { navigateTo, setNavigate } from "./services/navigationService";
import {
  isRememberablePath,
  loadLastPage,
  pickRestoreTarget,
  saveLastPage,
} from "./services/lastPageService";
import type { Role } from "./types/types";
import { loadRoleData } from "./services/roleDataService";
import { hideBootSplash, setBootStatus } from "./utils/bootSplash";

import { useAdminStore } from "./stores/useAdminStore";
import { useStudentStore } from "./stores/useStudentStore";
import { useCenterStore } from "./stores/useCenterStore";
import { useCourseStore } from "./stores/useCourseStore";
import { useFacilitatorStore } from "./stores/useFacilitatorStore";
import { primeNetworkStatus } from "./services/networkStatus";
import StudentLogin from "@/pages/auth/StudentLogin";
import FaciAdminLogin from "@/pages/auth/FaciAdminLogin";

import StudentLayout from "@/components/layout/students/StudentLayout";
import Dashboard from "@/pages/students/Dashboard";
import Courses from "@/pages/students/Courses";
import Shop from "@/pages/students/Shop";
import CoursePreview from "@/pages/students/CoursePreview";
import EnrolledCourseLayout from "@/components/layout/students/EnrolledCourseLayout";
import CourseModulePart from "@/pages/students/CourseModulePart";
import Profile from "@/pages/students/Profile";

import FacilitatorCourseLayout from "./components/layout/facilitators/FacilitatorCourseLayout";
import FacilitatorLayout from "@/components/layout/facilitators/FacilitatorLayout";
import FacilitatorDashboard from "@/pages/facilitators/Dashboard";
import FacilitatorCenters from "@/pages/facilitators/Centers";
import FacilitatorCourses from "@/pages/facilitators/Courses";
import FacilitatorViewCenter from "@/pages/facilitators/ViewCenter";
import FacilitatorCoursePreview from "@/pages/facilitators/CoursePreview";
import FacilitatorProfile from "@/pages/facilitators/Profile";
import FacilitatorAttendance from "@pages/facilitators/Attendance";
import FacilitatorAttendanceDetail from "@/pages/shared/AttendanceDetail";
import FacilitatorChangePassword from "@/pages/facilitators/ChangePassword";
import FacilitatorStudents from "./pages/shared/Students";

import AdminCourseLayout from "@/components/layout/admins/AdminCourseLayout";
import AdminCourseModulePart from "@/pages/shared/CourseModulePart";
import AdminLayout from "@/components/layout/admins/AdminLayout";
import AdminDashboard from "@/pages/admins/Dashboard";
import AdminStudents from "./pages/shared/Students";
import AdminFacilitators from "@/pages/admins/Facilitators";
import AdminTickets from "@/pages/admins/Tickets";
import AdminProfile from "@/pages/admins/Profile";
import AdminCourses from "@/pages/admins/Courses";
import AdminCenters from "@/pages/admins/Centers";
import AdminCoursePreview from "@/pages/admins/CoursePreview";
import AdminViewCenter from "@/pages/admins/ViewCenter";
import AdminAttendance from "@pages/admins/Attendance";
import AdminAttendanceDetail from "@/pages/shared/AttendanceDetail";
import AdminShop from "@pages/admins/Shop";

import QuestionBank from "@/pages/shared/QuestionBank";

import ChangePassword from "./pages/students/ChangePassword";
import ScrollToTop from "./components/shared/ScrollToTop";
import PublicRoute from "./components/shared/PublicRoute";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { ThemeProvider } from "./hooks/useTheme";
import UpdateNotifier from "./components/shared/UpdateNotifier";
import { useLockRefresh } from "./hooks/useLockRefresh";

// The one startup run for this app load (see the init effect in App).
let initPromise: Promise<void> | null = null;

// ── Sub‑component: NavigationRegistrar
function NavigationRegistrar() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);
  return null;
}

// ── Helper: the signed-in user, whichever role it is
function currentSessionUser(): { role: Role; userId: number } | null {
  const admin = useAdminStore.getState().currentAdmin;
  if (admin) return { role: "admin", userId: admin.id };
  const facilitator = useFacilitatorStore.getState().currentFacilitator;
  if (facilitator) return { role: "facilitator", userId: facilitator.id };
  const student = useStudentStore.getState().currentStudent;
  if (student) return { role: "student", userId: student.id };
  return null;
}

// ── Sub‑component: RememberLastPage
// Saves the page on every navigation (so a crash loses nothing), but only
// once startup is done, so the startup redirect can't overwrite the page
// that is about to be restored.
function RememberLastPage({ active }: { active: boolean }) {
  const location = useLocation();
  useEffect(() => {
    if (!active) return;
    const user = currentSessionUser();
    const path = location.pathname + location.search;
    if (user && isRememberablePath(path, user.role)) {
      saveLastPage({ ...user, path });
    }
  }, [active, location.pathname, location.search]);
  return null;
}

export default function App() {
  useLockRefresh();

  // ── Store actions
  const restoreAdminSession = useAdminStore((s) => s.restoreSession);
  const restoreFacilitatorSession = useFacilitatorStore(
    (s) => s.restoreSession,
  );
  const restoreStudentSession = useStudentStore((s) => s.restoreSession);
  const fetchCenters = useCenterStore((s) => s.fetchCenters);
  const fetchCourses = useCourseStore((s) => s.fetchCourses);

  // ── State
  const [isInitialized, setIsInitialized] = useState(false);

  // ── Effects: initialize app data (the splash in index.html shows meanwhile)
  useEffect(() => {
    const init = async () => {
      await primeNetworkStatus();

      // Group 1: restore all sessions in parallel
      setBootStatus("Signing you in…");
      const [, , studentRestoreResult] = await Promise.all([
        restoreAdminSession(),
        restoreFacilitatorSession(),
        restoreStudentSession(),
      ]);

      // Group 2: everything the signed-in role's screens need
      const user = currentSessionUser();
      if (user) setBootStatus("Loading your courses…");
      if (user && user.role !== "student") {
        await loadRoleData(user.role, "at startup");
      } else if (user) {
        // Students load their data inside the session restore (it also
        // covers offline); fetch only what it couldn't.
        const fetches: Promise<unknown>[] = [];
        if (!studentRestoreResult?.coursesFetched) fetches.push(fetchCourses());
        if (!studentRestoreResult?.centersFetched) fetches.push(fetchCenters());
        await Promise.all(fetches);
      }

      // Reopen the page this user had open when the app was last closed.
      // Routes only render after this, so the dashboard never flashes.
      setBootStatus("Almost ready…");
      const target = pickRestoreTarget(await loadLastPage(), user);
      if (target) navigateTo(target);
    };
    // Run startup once per app load: in dev, StrictMode calls this effect
    // twice, which used to send every startup request twice.
    // If startup ever fails unexpectedly, still show the app (worst case the
    // login screen) instead of leaving the splash up forever.
    (initPromise ??= init())
      .catch((err) => console.error("Startup failed:", err))
      .finally(() => {
        setIsInitialized(true);
        hideBootSplash();
      });
  }, []);

  // ── Render: application routes
  return (
    <ThemeProvider>
      <BrowserRouter>
        <NavigationRegistrar />
        <RememberLastPage active={isInitialized} />
        <ScrollToTop />
        <UpdateNotifier />
        {!isInitialized ? null : (
          <ErrorBoundary>
            <Routes>
              {/* Public routes */}
              <Route
                path="/"
                element={
                  <PublicRoute>
                    <Navigate to="/student/login" replace />
                  </PublicRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Navigate to="/student/login" replace />
                  </PublicRoute>
                }
              />

              {/* Authentication pages */}
              <Route
                path="/student/login"
                element={
                  <PublicRoute>
                    <StudentLogin />
                  </PublicRoute>
                }
              />
              <Route
                path="/facilitator-admin/login"
                element={
                  <PublicRoute>
                    <FaciAdminLogin />
                  </PublicRoute>
                }
              />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route
                path="/facilitator/change-password"
                element={<FacilitatorChangePassword />}
              />

              {/* Student routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute role="student">
                    <StudentLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="shop" element={<Shop />} />
                <Route path="profile" element={<Profile />} />
                <Route path="courses" element={<Courses />} />
                <Route
                  path="courses/:courseName/course-preview"
                  element={<CoursePreview />}
                />
                <Route
                  path="course/:courseId/:moduleNumber/*"
                  element={<EnrolledCourseLayout />}
                >
                  <Route index element={<CourseModulePart />} />
                  <Route path="*" element={<CourseModulePart />} />
                </Route>
              </Route>

              {/* Facilitator routes */}
              <Route
                path="/facilitator"
                element={
                  <ProtectedRoute role="facilitator">
                    <FacilitatorLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<FacilitatorDashboard />} />
                <Route path="profile" element={<FacilitatorProfile />} />
                <Route path="students" element={<FacilitatorStudents />} />
                <Route path="question-bank" element={<QuestionBank />} />
                <Route path="attendance" element={<FacilitatorAttendance />} />
                <Route
                  path="attendance/:attendanceId"
                  element={<FacilitatorAttendanceDetail />}
                />
                <Route path="centers" element={<FacilitatorCenters />} />
                <Route
                  path="centers/:centerId/view"
                  element={<FacilitatorViewCenter />}
                />
                <Route path="courses" element={<FacilitatorCourses />} />
                <Route
                  path="courses/:courseName/course-preview"
                  element={<FacilitatorCoursePreview />}
                />
                <Route
                  path="course/:courseSlug/:moduleNumber/*"
                  element={<FacilitatorCourseLayout />}
                >
                  <Route index element={<AdminCourseModulePart />} />
                  <Route path="*" element={<AdminCourseModulePart />} />
                </Route>
              </Route>

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="admin">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="centers" element={<AdminCenters />} />
                <Route
                  path="centers/:centerId/view"
                  element={<AdminViewCenter />}
                />
                <Route path="students" element={<AdminStudents />} />
                <Route path="facilitators" element={<AdminFacilitators />} />
                <Route path="tickets" element={<AdminTickets />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="attendance" element={<AdminAttendance />} />
                <Route path="shop" element={<AdminShop />} />
                <Route path="question-bank" element={<QuestionBank />} />
                <Route
                  path="attendance/:attendanceId"
                  element={<AdminAttendanceDetail />}
                />
                <Route path="courses" element={<AdminCourses />} />
                <Route
                  path="courses/:courseName/course-preview"
                  element={<AdminCoursePreview />}
                />
                <Route
                  path="course/:courseSlug/:moduleNumber/*"
                  element={<AdminCourseLayout />}
                >
                  <Route index element={<AdminCourseModulePart />} />
                  <Route path="*" element={<AdminCourseModulePart />} />
                </Route>
              </Route>

              {/* Catch-all redirect */}
              <Route
                path="*"
                element={<Navigate to="/student/login" replace />}
              />
            </Routes>
          </ErrorBoundary>
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
}
