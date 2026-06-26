// src/stores/useStudentListStore.ts
import { create } from "zustand";
import { Student } from "@/types/types";
import { studentService } from "@/services/studentService";
import { toast } from "react-toastify";
import { useCenterStore } from "./useCenterStore";

interface StudentListStore {
  students: Student[];
  isLoading: boolean;
  fetchStudents: () => Promise<void>;
  addStudent: (data: {
    idNumber: string;
    password: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    currentCenter?: number | null;
    profilePicture?: string | null;
  }) => Promise<void>;
  updateStudent: (id: number, data: Partial<Student>) => Promise<void>;
  removeStudent: (id: number) => Promise<void>;
}

export const useStudentListStore = create<StudentListStore>()((set) => ({
  // ── State
  students: [],
  isLoading: false,

  // ── Actions: fetch all students
  fetchStudents: async () => {
    set({ isLoading: true });
    try {
      const students = await studentService.getAll();
      set({ students });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch students.");
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: add student
  addStudent: async (data) => {
    try {
      const newStudent = await studentService.create(data);
      set((state) => ({ students: [newStudent, ...state.students] }));

      if (newStudent.currentCenter) {
        await useCenterStore.getState().fetchCenters();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create student.");
      throw err;
    }
  },

  // ── Actions: update student
  updateStudent: async (id, data) => {
    try {
      await studentService.update(id, data);
      set((state) => ({
        students: state.students.map((s) =>
          s.id === id ? { ...s, ...data } : s,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update student.");
      throw err;
    }
  },

  // ── Actions: remove student
  removeStudent: async (id) => {
    try {
      await studentService.delete(id);
      set((state) => ({
        students: state.students.filter((s) => s.id !== id),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove student.");
      throw err;
    }
  },
}));
