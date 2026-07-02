// src/components/shared/StudentAvatar.tsx
import { useState } from "react";
import { Student } from "@/types/types";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface StudentAvatarProps {
  student: Student;
  sizeClass?: string;
}

// Canonical student avatar: real photo when available, online, and not
// errored; otherwise a solid-blue circle with the student's first initial.
// Never imports a fallback image from @/assets per project convention.
//
// Previously duplicated identically in Student.tsx, AddStudentModal.tsx,
// AttendanceTab.tsx, and Students.tsx — consolidated here. Update all four
// call sites to import from here instead of keeping their local copy.
export default function StudentAvatar({
  student,
  sizeClass = "w-10 h-10",
}: StudentAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const online = useOnlineStatus();
  const src = student.profilePicture?.startsWith("/api/")
    ? `${(import.meta.env.VITE_API_URL as string).replace(/\/api$/, "")}${student.profilePicture}`
    : student.profilePicture;

  if (!src || !online || hasError) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold bg-blue-500 shrink-0`}
      >
        {student.firstName.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${student.firstName} ${student.lastName}`}
      className={`${sizeClass} rounded-full object-cover shrink-0`}
      onError={(e) => {
        const img = e.target as HTMLImageElement;
        if (!img.dataset.errored) {
          img.dataset.errored = "1";
          setHasError(true);
        }
      }}
    />
  );
}
