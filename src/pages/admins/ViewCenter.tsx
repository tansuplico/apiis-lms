// src/pages/admin/ViewCenter.tsx
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Users,
  BookOpen,
  Trash2,
  UserCheck,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Course, Facilitator } from "@/types/types";
import { toast } from "react-toastify";
import { useDebounce } from "@/hooks/useDebounce";

import ViewCenterGridCard from "@/components/shared/ViewCenterGridCard";
import ViewCenterListItem from "@/components/shared/ViewCenterListItem";
import AddCourseModal from "@/components/shared/AddCourseModal";
import AddStudentModal from "@/components/shared/AddStudentModal";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal";
import ViewStudents from "@/components/shared/ViewStudents";
import { useStudentListStore } from "@/stores/useStudentListStore";
import { useCenterStore } from "@/stores/useCenterStore";
import { useCourseStore } from "@/stores/useCourseStore";
import ProgressTab from "@/components/shared/ProgressTab";
import { useFacilitatorListStore } from "@/stores/useFacilitatorListStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function ViewCenter() {
  // ── Store
  const { centerId } = useParams();
  const { courses } = useCourseStore();
  const {
    centers,
    deleteCenter,
    removeCourse,
    assignFacilitator,
    unassignFacilitator,
  } = useCenterStore();
  const { students } = useStudentListStore();
  const { facilitators } = useFacilitatorListStore();
  const navigate = useNavigate();
  const online = useOnlineStatus();

  // ── State: modals & deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingCenter, setIsDeletingCenter] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddExistingCourseModal, setShowAddExistingCourseModal] =
    useState(false);
  const [showRemoveCourseModal, setShowRemoveCourseModal] = useState(false);
  const [courseToRemove, setCourseToRemove] = useState<Course | null>(null);
  const [isRemovingCourse, setIsRemovingCourse] = useState(false);

  // ── State: search, view & active tab
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [modalViewMode, setModalViewMode] = useState<"grid" | "list">("grid");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    (searchParams.get("tab") as
      | "courses"
      | "students"
      | "progress"
      | "facilitators") ?? "courses";

  const setActiveTab = (
    tab: "courses" | "students" | "progress" | "facilitators",
  ) => {
    setSearchParams({ tab });
  };

  // ── State: facilitator assignment
  const [facilitatorSearch, setFacilitatorSearch] = useState("");
  const [isAssigning, setIsAssigning] = useState<number | null>(null);
  const [isUnassigning, setIsUnassigning] = useState<number | null>(null);
  const [facilitatorPendingAssign, setFacilitatorPendingAssign] =
    useState<Facilitator | null>(null);
  const MAX_FACILITATORS = 3;

  // ── State: add course selection
  const [selectedCoursesToAdd, setSelectedCoursesToAdd] = useState<number[]>(
    [],
  );

  // ── Derived: current center
  const currentCenter = centers.find((c) => c.id === Number(centerId));
  const centerTitle = currentCenter?.title ?? "Unknown Center";

  // ── Derived: filtered courses (center tab)
  const filteredCourses = useMemo(() => {
    if (!currentCenter) return [];
    const centerCourses = courses.filter((c) =>
      (currentCenter.courses ?? []).includes(c.id),
    );
    if (!debouncedSearch.trim()) return centerCourses;
    const lower = debouncedSearch.toLowerCase().trim();
    return centerCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower),
    );
  }, [currentCenter, courses, debouncedSearch]);

  // ── Derived: filtered students
  const filteredStudents = useMemo(() => {
    if (!currentCenter) return [];
    const centerStudents = students.filter((s) =>
      (currentCenter.students ?? []).includes(s.id),
    );
    if (!debouncedSearch.trim()) return centerStudents;
    const lower = debouncedSearch.toLowerCase().trim();
    return centerStudents.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(lower) ||
        s.idNumber.toLowerCase().includes(lower),
    );
  }, [currentCenter, students, debouncedSearch]);

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

  // ── Derived: full lists (for progress tab)
  const centerStudents = students.filter((s) =>
    (currentCenter?.students ?? []).includes(s.id),
  );
  const centerCourses = courses.filter((c) =>
    (currentCenter?.courses ?? []).includes(c.id),
  );

  const doAssignFacilitator = async (facilitatorId: number) => {
    if (!currentCenter) return;
    setIsAssigning(facilitatorId);
    await assignFacilitator(currentCenter.id, facilitatorId);
    setIsAssigning(null);
    setFacilitatorPendingAssign(null);
  };

  const handleAssignClick = (f: Facilitator) => {
    if (f.assignedCenterIds.length > 0) {
      setFacilitatorPendingAssign(f);
    } else {
      void doAssignFacilitator(f.id);
    }
  };

  // ── Handlers: center deletion
  const handleDeleteCenter = async () => {
    if (!currentCenter) return;
    setIsDeletingCenter(true);
    try {
      await deleteCenter(currentCenter.id);
      setShowDeleteModal(false);
      navigate("/admin/centers");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete center.", {
        position: "bottom-right",
      });
    } finally {
      setIsDeletingCenter(false);
    }
  };

  // ── Guard: center not found
  if (!currentCenter) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">
        Center not found.
      </div>
    );
  }

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h3 className="text-4xl text-gray-900 dark:text-white">
          {centerTitle}
        </h3>

        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={isDeletingCenter || !online}
          title={!online ? "You're offline" : "Delete Center"}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-lg shadow-md text-md transition-all shrink-0 ${
            online
              ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white cursor-pointer"
              : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          }`}
        >
          <Trash2 size={20} />
          Delete Center
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
        <button
          onClick={() => setActiveTab("courses")}
          className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
            activeTab === "courses"
              ? "border-b-4 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
          }`}
        >
          <BookOpen size={20} />
          Courses
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
            activeTab === "students"
              ? "border-b-4 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
          }`}
        >
          <Users size={20} />
          Students
        </button>
        <button
          onClick={() => setActiveTab("progress")}
          className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
            activeTab === "progress"
              ? "border-b-4 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
          }`}
        >
          <LayoutGrid size={20} />
          Progress
        </button>
        <button
          onClick={() => setActiveTab("facilitators")}
          className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
            activeTab === "facilitators"
              ? "border-b-4 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
          }`}
        >
          <UserCheck size={20} />
          Facilitators
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

            <div className="flex gap-10">
              <button
                disabled={!online}
                title={!online ? "You're offline" : "Add Course"}
                className={`flex items-center gap-2 px-6 py-3 font-medium rounded-lg shadow-md text-md transition-all shrink-0 ${
                  online
                    ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white cursor-pointer"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                }`}
                onClick={() => setShowAddExistingCourseModal(true)}
              >
                <Plus size={20} />
                Add Course
              </button>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 transition-colors">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 rounded transition-colors ${
                    viewMode === "list"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                  aria-label="List view"
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
                  aria-label="Grid view"
                >
                  <LayoutGrid size={24} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              No courses found
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr">
              {filteredCourses.map((course) => (
                <ViewCenterGridCard
                  key={course.id}
                  course={course}
                  role="admin"
                  onRemove={(c) => {
                    setCourseToRemove(c);
                    setShowRemoveCourseModal(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredCourses.map((course) => (
                <ViewCenterListItem
                  key={course.id}
                  course={course}
                  role="admin"
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

      {/* Progress Tab */}
      {activeTab === "progress" && (
        <ProgressTab centerStudents={centerStudents} courses={centerCourses} />
      )}

      {/* Facilitators Tab */}
      {activeTab === "facilitators" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Assigned Facilitators
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({currentCenter.facilitatorIds.length}/{MAX_FACILITATORS})
                </span>
              </h3>
            </div>

            {currentCenter.facilitatorIds.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                No facilitators assigned to this center yet.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray">
                {currentCenter.facilitatorIds.map((fId) => {
                  const facilitator = facilitators.find((f) => f.id === fId);
                  if (!facilitator) return null;
                  return (
                    <li
                      key={fId}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                          {facilitator.firstName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {facilitator.firstName} {facilitator.lastName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {facilitator.email}
                          </p>
                        </div>
                      </div>
                      <button
                        disabled={isUnassigning === fId || !online}
                        onClick={async () => {
                          setIsUnassigning(fId);
                          await unassignFacilitator(currentCenter.id, fId);
                          setIsUnassigning(null);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-red-600 dark:text-red-400 ${!online ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50 dark:hover:bg-red-900/30"}`}
                      >
                        <UserMinus size={16} />
                        {isUnassigning === fId ? "Removing..." : "Remove"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {currentCenter.facilitatorIds.length < MAX_FACILITATORS && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Add Facilitator
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-4 py-2.5 rounded-lg mb-4">
                  <Search
                    size={18}
                    className="text-gray-500 dark:text-gray-400 shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="Search facilitators..."
                    value={facilitatorSearch}
                    onChange={(e) => setFacilitatorSearch(e.target.value)}
                    className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                {(() => {
                  const available = facilitators.filter(
                    (f) =>
                      !currentCenter.facilitatorIds.includes(f.id) &&
                      f.status === "active" &&
                      (!facilitatorSearch.trim() ||
                        `${f.firstName} ${f.lastName}`
                          .toLowerCase()
                          .includes(facilitatorSearch.toLowerCase()) ||
                        f.email
                          .toLowerCase()
                          .includes(facilitatorSearch.toLowerCase())),
                  );

                  if (available.length === 0) {
                    return (
                      <p className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                        {facilitatorSearch.trim()
                          ? "No facilitators match your search."
                          : "All active facilitators are already assigned."}
                      </p>
                    );
                  }

                  return (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray">
                      {available.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-linear-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                              {f.firstName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">
                                {f.firstName} {f.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {f.email}
                              </p>
                            </div>
                          </div>
                          <button
                            disabled={isAssigning === f.id}
                            onClick={() => handleAssignClick(f)}
                            className="flex items-center gap-1.5 px-3 py-1.5 mr-3 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <UserPlus size={15} />
                            {isAssigning === f.id ? "Assigning..." : "Assign"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          )}

          {currentCenter.facilitatorIds.length >= MAX_FACILITATORS && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Maximum of {MAX_FACILITATORS} facilitators reached for this
              center.
            </p>
          )}
        </div>
      )}

      {/* Modals */}
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
          GridCard={(props) => <ViewCenterGridCard {...props} role="admin" />}
          ListItem={(props) => <ViewCenterListItem {...props} role="admin" />}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          title="Delete Center?"
          message={`Are you sure you want to delete "${centerTitle}"? This will permanently remove the center and all its data. This action cannot be undone.`}
          itemName=""
          onConfirm={handleDeleteCenter}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={isDeletingCenter}
        />
      )}

      {facilitatorPendingAssign && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Facilitator Already Assigned
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              <span className="font-semibold text-gray-900 dark:text-white">
                {facilitatorPendingAssign.firstName}{" "}
                {facilitatorPendingAssign.lastName}
              </span>{" "}
              was already assigned in center
              {facilitatorPendingAssign.assignedCenterIds.length > 1
                ? "s"
                : ""}{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {facilitatorPendingAssign.assignedCenterIds
                  .map(
                    (cid) =>
                      centers.find((c) => c.id === cid)?.title ?? "Unknown",
                  )
                  .join(", ")}
              </span>
              . Do you still want to assign them to this center as well?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() =>
                  void doAssignFacilitator(facilitatorPendingAssign.id)
                }
                disabled={isAssigning === facilitatorPendingAssign.id}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
              >
                {isAssigning === facilitatorPendingAssign.id
                  ? "Assigning..."
                  : "Assign Anyway"}
              </button>
              <button
                onClick={() => setFacilitatorPendingAssign(null)}
                disabled={isAssigning === facilitatorPendingAssign.id}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
