import { apiClient } from "./apiClient";
import { AttendanceRecord } from "@/types/types";

interface SubmitAttendanceRecord {
  studentId: number;
  status: "present" | "absent";
}

interface AttendanceSummary {
  overall: {
    totalRecords: number;
    totalPresent: number;
    totalAbsent: number;
    totalDays: number;
    totalStudents: number;
    attendanceRate: number;
  };
  students: {
    studentId: number;
    firstName: string;
    lastName: string;
    idNumber: string;
    totalDays: number;
    presentDays: number;
    absentDays: number;
    attendanceRate: number;
  }[];
}

interface StudentAttendanceResponse {
  summary: {
    total: number;
    present: number;
    absent: number;
    attendanceRate: number;
  };
  records: AttendanceRecord[];
}

function buildFilterQuery(filters?: {
  startDate?: string;
  endDate?: string;
  date?: string;
}): string {
  if (filters?.date) return `?date=${filters.date}`;
  if (filters?.startDate && filters?.endDate)
    return `?startDate=${filters.startDate}&endDate=${filters.endDate}`;
  return "";
}

export const attendanceService = {
  // PASA ATTENDANCE SA CENTER
  submit: async (
    centerId: number,
    date: string,
    records: SubmitAttendanceRecord[],
  ): Promise<void> => {
    await apiClient.post("/attendance", {
      centerId,
      date,
      records,
    });
  },

  delete: async (attendanceId: number): Promise<void> => {
    await apiClient.delete(`/attendance/${attendanceId}`);
  },

  // UPDATE ISA KA ATTENDANCE RECORD (facilitator)
  update: async (
    attendanceId: number,
    status: "present" | "absent",
  ): Promise<void> => {
    await apiClient.put(`/attendance/${attendanceId}`, { status });
  },

  // KUHA ATTENDANCE
  getByCenter: async (
    centerId: number,
    filters?: { date?: string; startDate?: string; endDate?: string },
  ) => {
    const response = await apiClient.get<AttendanceRecord[]>(
      `/attendance/center/${centerId}${buildFilterQuery(filters)}`,
    );
    return response.data ?? [];
  },

  getSummary: async (
    centerId: number,
    filters?: { startDate?: string; endDate?: string },
  ) => {
    const response = await apiClient.get<AttendanceSummary>(
      `/attendance/center/${centerId}/summary${buildFilterQuery(filters)}`,
    );
    return response.data!;
  },

  getMyAttendance: async (filters?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get<StudentAttendanceResponse>(
      `/attendance/student/me${buildFilterQuery(filters)}`,
    );
    return response.data!;
  },

  getByStudent: async (
    studentId: number,
    filters?: { startDate?: string; endDate?: string },
  ) => {
    const response = await apiClient.get<StudentAttendanceResponse>(
      `/attendance/student/${studentId}${buildFilterQuery(filters)}`,
    );
    return response.data!;
  },

  getByFacilitator: async (
    facilitatorId?: number,
    filters?: { startDate?: string; endDate?: string },
  ) => {
    const path = facilitatorId
      ? `/attendance/facilitator/${facilitatorId}`
      : `/attendance/facilitator/me`;
    const response = await apiClient.get<AttendanceRecord[]>(
      `${path}${buildFilterQuery(filters)}`,
    );
    return response.data ?? [];
  },
};
