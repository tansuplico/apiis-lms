// src/pages/facilitators/ViewCenter.tsx
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Users,
  BookOpen,
  CalendarCheck,
  ChartBar,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";

import ViewCenterGridCard from "@/components/shared/ViewCenterGridCard";
import ViewCenterListItem from "@/components/shared/ViewCenterListItem";
import AddCourseModal from "@/components/shared/AddCourseModal";
import AddStudentModal from "@/components/shared/AddStudentModal";
import { Course } from "@/types/types";
import { useCenterStore } from "@/stores/useCenterStore";
import { useCourseStore } from "@/stores/useCourseStore";
import { useStudentListStore } from "@/stores/useStudentListStore";
import ProgressTab from "@/components/shared/ProgressTab";
import AttendanceTab from "@/components/shared/AttendanceTab";
import ViewStudents from "@/components/shared/ViewStudents";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal";
import { toast } from "react-toastify";

export default function ViewCenter() {
  // ── Store
  const { centerId } = useParams();
  const { centers, removeCourse } = useCenterStore();
  const { students } = useStudentListStore();
  const { courses } = useCourseStore();

  // ── State: UI
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [modalViewMode, setModalViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<
    "courses" | "students" | "attendance" | "progress"
  >("courses");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [modalSearchTerm, setModalSearchTerm] = useState("");

  // ── State: selection & modals
  const [selectedCoursesToAdd, setSelectedCoursesToAdd] = useState<number[]>(
    [],
  );
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddExistingCourseModal, setShowAddExistingCourseModal] =
    useState(false);
  const [showRemoveCourseModal, setShowRemoveCourseModal] = useState(false);
  const [courseToRemove, setCourseToRemove] = useState<Course | null>(null);
  const [isRemovingCourse, setIsRemovingCourse] = useState(false);

  // ── Derived: current center & helpers
  const currentCenter = centers.find((c) => c.id === Number(centerId));
  const centerTitle = currentCenter?.title ?? "Unknown Center";

  const centerStudents = useMemo(() => {
    if (!currentCenter) return [];
    return students.filter((s) => currentCenter.students.includes(s.id));
  }, [currentCenter, students]);

  const centerCourses = useMemo(() => {
    if (!currentCenter) return [];
    return courses.filter((c) => currentCenter.courses.includes(c.id));
  }, [currentCenter, courses]);

  // ── Derived: filtered lists
  const filteredCourses = useMemo(() => {
    if (!debouncedSearch.trim()) return centerCourses;
    const lower = debouncedSearch.toLowerCase().trim();
    return centerCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower),
    );
  }, [centerCourses, debouncedSearch]);

  const filteredStudents = useMemo(() => {
    if (!debouncedSearch.trim()) return centerStudents;
    const lower = debouncedSearch.toLowerCase().trim();
    return centerStudents.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(lower) ||
        s.idNumber.toLowerCase().includes(lower),
    );
  }, [centerStudents, debouncedSearch]);

  // ── Derived: available courses to add (modal) — unfiltered base list.
  const availableCourses = useMemo(() => {
    if (!currentCenter) return [];
    return courses.filter((c) => !(currentCenter.courses ?? []).includes(c.id));
  }, [currentCenter, courses]);

  // ── Derived: available courses, narrowed by the modal's search term
  const filteredAvailableCourses = useMemo(() => {
    if (!modalSearchTerm.trim()) return availableCourses;
    const lower = modalSearchTerm.toLowerCase().trim();
    return availableCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower),
    );
  }, [availableCourses, modalSearchTerm]);

  // ── Guard: center not found
  if (!currentCenter) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">
        Center not found.
      </div>
    );
  }

  // ── Helper: tab class
  const tabClass = (tab: typeof activeTab) =>
    `flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
      activeTab === tab
        ? "border-b-4 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
    }`;

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h3 className="text-4xl text-gray-900 dark:text-white">
          {centerTitle}
        </h3>
        {activeTab === "courses" && (
          <button
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
            onClick={() => setShowAddExistingCourseModal(true)}
          >
            <Plus size={20} />
            Add Course
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
        <button
          onClick={() => setActiveTab("courses")}
          className={tabClass("courses")}
        >
          <BookOpen size={20} /> Courses
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={tabClass("students")}
        >
          <Users size={20} /> Students
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={tabClass("attendance")}
        >
          <CalendarCheck size={20} /> Attendance
        </button>
        <button
          onClick={() => setActiveTab("progress")}
          className={tabClass("progress")}
        >
          <ChartBar size={20} /> Progress
        </button>
      </div>

      {/* Courses Tab */}
      {activeTab === "courses" && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="w-full sm:w-80 lg:w-96 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg transition-colors">
              <Search
                size={20}
                strokeWidth={1.5}
                className="text-gray-500 dark:text-gray-400"
              />
              <input
                type="text"
                placeholder="Search a course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 transition-colors">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <List size={24} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <LayoutGrid size={24} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              No courses found
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr">
              {" "}
              {filteredCourses.map((course) => (
                <ViewCenterGridCard
                  key={course.id}
                  course={course}
                  role="facilitator"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredCourses.map((course) => (
                <ViewCenterListItem
                  key={course.id}
                  course={course}
                  role="facilitator"
                  onRemove={(c) => {
                    setCourseToRemove(c);
                    setShowRemoveCourseModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Students Tab */}
      {activeTab === "students" && (
        <ViewStudents
          filteredStudents={filteredStudents}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setShowAddStudentModal={setShowAddStudentModal}
          centerTitle={centerTitle}
          centerId={currentCenter.id}
        />
      )}

      {/* Attendance Tab */}
      {activeTab === "attendance" && (
        <AttendanceTab
          centerId={currentCenter.id}
          centerName={centerTitle}   
          centerStudents={centerStudents}
        />
      )}

      {/* Progress Tab */}
      {activeTab === "progress" && (
        <ProgressTab centerStudents={centerStudents} courses={centerCourses} />
      )}

      {showRemoveCourseModal && courseToRemove && (
        <DeleteConfirmModal
          title="Remove Course?"
          message={`Are you sure you want to remove "${courseToRemove.title}" from ${centerTitle}?`}
          itemName=""
          onConfirm={async () => {
            setIsRemovingCourse(true);
            const success = await removeCourse(
              currentCenter.id,
              courseToRemove.id,
            );
            setIsRemovingCourse(false);
            if (!success) return;
            toast.success(
              `${courseToRemove.title} removed from ${centerTitle}.`,
              {
                position: "bottom-right",
              },
            );
            setShowRemoveCourseModal(false);
            setCourseToRemove(null);
          }}
          onCancel={() => {
            setShowRemoveCourseModal(false);
            setCourseToRemove(null);
          }}
          isDeleting={isRemovingCourse}
        />
      )}

      {showAddStudentModal && (
        <AddStudentModal
          centerTitle={centerTitle}
          centerId={currentCenter.id}
          onClose={() => setShowAddStudentModal(false)}
        />
      )}

      {showAddExistingCourseModal && (
        <AddCourseModal
          centerId={Number(centerId)}
          setShowAddExistingCourseModal={setShowAddExistingCourseModal}
          modalSearchTerm={modalSearchTerm}
          setModalSearchTerm={setModalSearchTerm}
          modalViewMode={modalViewMode}
          setModalViewMode={setModalViewMode}
          selectedCoursesToAdd={selectedCoursesToAdd}
          setSelectedCoursesToAdd={setSelectedCoursesToAdd}
          availableCourses={availableCourses}
          filteredAvailableCourses={filteredAvailableCourses}
          GridCard={(props) => (
            <ViewCenterGridCard {...props} role="facilitator" />
          )}
          ListItem={(props) => (
            <ViewCenterListItem {...props} role="facilitator" />
          )}
        />
      )}
    </div>
  );
}
