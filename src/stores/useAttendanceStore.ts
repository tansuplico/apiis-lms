// src/stores/useAttendanceStore.ts
import { create } from "zustand";
import { AttendanceRecord } from "@/types/types";
import { attendanceService } from "@/services/attendanceService";
import { toast } from "react-toastify";

interface AttendanceSummaryStudent {
  studentId: number;
  firstName: string;
  lastName: string;
  idNumber: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
}

interface AttendanceOverall {
  totalRecords: number;
  totalPresent: number;
  totalAbsent: number;
  totalDays: number;
  totalStudents: number;
  attendanceRate: number;
}

interface StudentAttendanceSummary {
  total: number;
  present: number;
  absent: number;
  attendanceRate: number;
}

interface AttendanceStore {
  records: AttendanceRecord[];
  summary: AttendanceSummaryStudent[];
  overall: AttendanceOverall | null;
  myRecords: AttendanceRecord[];
  mySummary: StudentAttendanceSummary | null;

  studentRecords: AttendanceRecord[]; // ← added
  studentSummary: StudentAttendanceSummary | null; // ← added
  isLoading: boolean;
  isSubmitting: boolean;
  isLoadingStudentRecords: boolean;

  saveAttendance: (
    centerId: number,
    records: { studentId: number; status: "present" | "absent" }[],
    date?: string,
  ) => Promise<void>;

  getAttendanceByCenter: (centerId: number) => Promise<void>;
  getAttendanceByDate: (centerId: number, date: string) => Promise<void>;
  getAttendanceByFacilitator: () => Promise<void>;
  deleteAttendance: (attendanceId: number) => Promise<void>;
  updateAttendanceRecord: (
    attendanceId: number,
    status: "present" | "absent",
  ) => Promise<void>;
  fetchMyAttendance: (filters?: {
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  fetchSummary: (
    centerId: number,
    filters?: { startDate?: string; endDate?: string },
  ) => Promise<void>;
  fetchStudentAttendance: (studentId: number) => Promise<void>;
}

export const useAttendanceStore = create<AttendanceStore>()((set, get) => ({
  // ── State
  records: [],
  summary: [],
  overall: null,
  myRecords: [],
  mySummary: null,
  studentRecords: [], // ← added
  studentSummary: null,
  isLoading: false,
  isSubmitting: false,
  isLoadingStudentRecords: false,

  // ── Actions: save attendance
  saveAttendance: async (centerId, records, date) => {
    set({ isSubmitting: true });
    try {
      const attendanceDate = date ?? new Date().toISOString().split("T")[0];

      await attendanceService.submit(centerId, attendanceDate, records);
      await get().getAttendanceByCenter(centerId);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save attendance.");
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  // ── Actions: get by center
  getAttendanceByCenter: async (centerId) => {
    set({ isLoading: true });
    try {
      const records = await attendanceService.getByCenter(centerId);

      set((state) => ({
        records: [
          ...state.records.filter((r) => r.centerId !== centerId),
          ...records,
        ],
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch attendance.");
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: get by date
  getAttendanceByDate: async (centerId: number, date: string) => {
    try {
      const data = await attendanceService.getByCenter(centerId, { date });
      set((state) => ({
        records: [
          ...state.records.filter(
            (r) => !(r.centerId === centerId && r.date === date),
          ),
          ...data,
        ],
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch attendance.");
    }
  },

  // ── Actions: get by facilitator
  getAttendanceByFacilitator: async () => {
    set({ isLoading: true });
    try {
      const records = await attendanceService.getByFacilitator();
      set({ records });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch attendance.");
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: delete
  deleteAttendance: async (attendanceId) => {
    try {
      await attendanceService.delete(attendanceId);
      set((state) => ({
        records: state.records.filter((r) => r.id !== attendanceId),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete attendance.");
      throw err;
    }
  },

  // ── Actions: update
  updateAttendanceRecord: async (attendanceId, status) => {
    try {
      await attendanceService.update(attendanceId, status);
      set((state) => ({
        records: state.records.map((r) =>
          r.id === attendanceId ? { ...r, status } : r,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update attendance.");
      throw err;
    }
  },

  // ── Actions: fetch my attendance
  fetchMyAttendance: async (filters) => {
    set({ isLoading: true });
    try {
      const result = await attendanceService.getMyAttendance(filters);
      set({
        myRecords: result.records,
        mySummary: result.summary,
      });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch your attendance.");
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: fetch summary
  fetchSummary: async (centerId, filters) => {
    set({ isLoading: true });
    try {
      const result = await attendanceService.getSummary(centerId, filters);
      set({
        summary: result.students,
        overall: result.overall,
      });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch summary.");
    } finally {
      set({ isLoading: false });
    }
  },
  // ── Actions: fetch one student's full attendance history (all centers)
  fetchStudentAttendance: async (studentId) => {
    set({ isLoadingStudentRecords: true });
    try {
      const result = await attendanceService.getByStudent(studentId);
      set({
        studentRecords: result.records,
        studentSummary: result.summary,
      });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch student's attendance.");
    } finally {
      set({ isLoadingStudentRecords: false });
    }
  },
}));
