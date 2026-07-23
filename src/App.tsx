// src/App.tsx
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import "./App.css";

import { useEffect, useState } from "react";
import { setNavigate } from "./services/navigationService";

import { useAdminStore } from "./stores/useAdminStore";
import { useStudentStore } from "./stores/useStudentStore";
import { useCenterStore } from "./stores/useCenterStore";
import { useCourseStore } from "./stores/useCourseStore";
import { useStudentListStore } from "./stores/useStudentListStore";
import { useFacilitatorListStore } from "./stores/useFacilitatorListStore";
import { useFacilitatorStore } from "./stores/useFacilitatorStore";
import { useTicketStore } from "./stores/useTicketStore";

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

import QuestionBank from "@/pages/admins/QuestionBank";

import ChangePassword from "./pages/students/ChangePassword";
import ScrollToTop from "./components/shared/ScrollToTop";
import PublicRoute from "./components/shared/PublicRoute";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import { useQuizBankCollectionStore } from "./stores/useQuizBankCollectionStore";

// ── Sub‑component: NavigationRegistrar
function NavigationRegistrar() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);
  return null;
}

export default function App() {
  // ── Store actions
  const restoreAdminSession = useAdminStore((s) => s.restoreSession);
  const restoreFacilitatorSession = useFacilitatorStore(
    (s) => s.restoreSession,
  );
  const restoreStudentSession = useStudentStore((s) => s.restoreSession);
  const fetchCenters = useCenterStore((s) => s.fetchCenters);
  const fetchCourses = useCourseStore((s) => s.fetchCourses);
  const fetchStudents = useStudentListStore((s) => s.fetchStudents);
  const fetchFacilitators = useFacilitatorListStore((s) => s.fetchFacilitators);
  const fetchTickets = useTicketStore((s) => s.fetchTickets);
  const fetchCollections = useQuizBankCollectionStore(
    (s) => s.fetchCollections,
  );

  // ── State
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) {
      const loader = document.getElementById("app-loader");
      if (loader) {
        loader.classList.add("fade-out");
        setTimeout(() => loader.remove(), 300);
      }
    }
  }, [isInitialized]);

  // ── Effects: initialize app data
  useEffect(() => {
    const init = async () => {
      // Group 1: restore all sessions in parallel
      const [, , studentRestoreResult] = await Promise.all([
        restoreAdminSession(),
        restoreFacilitatorSession(),
        restoreStudentSession(),
      ]);

      const isAdmin = !!useAdminStore.getState().currentAdmin;
      const isFacilitator = !!useFacilitatorStore.getState().currentFacilitator;
      const isStudent = !!useStudentStore.getState().currentStudent;
      const studentAlreadyFetchedCourses =
        isStudent && studentRestoreResult?.coursesFetched;

      // Group 2: all independent — run together
      const fetches: Promise<any>[] = [];

      if (
        (isAdmin || isFacilitator || isStudent) &&
        !studentAlreadyFetchedCourses
      ) {
        fetches.push(fetchCourses());
      }
      if (isAdmin || isFacilitator || isStudent) {
        fetches.push(fetchCenters());
      }
      if (isAdmin || isFacilitator) {
        fetches.push(fetchStudents());
        fetches.push(fetchCollections());
      }
      if (isAdmin) {
        fetches.push(fetchFacilitators());
        fetches.push(fetchTickets());
      }

      await Promise.all(fetches);

      setIsInitialized(true);
    };
    init();
  }, []);

  // ── Render: application routes
  return (
    <BrowserRouter>
      <NavigationRegistrar />
      <ScrollToTop />
      {!isInitialized ? (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600" />
        </div>
      ) : (
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
          <Route path="*" element={<Navigate to="/student/login" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
