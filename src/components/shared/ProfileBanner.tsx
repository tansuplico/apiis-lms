// src/components/shared/ProfileBanner.tsx
import { Admin, Facilitator, Student } from "@/types/types";
import { Camera, Edit2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface ProfileBannerProps {
  user: Admin | Facilitator | Student;
  role: "admin" | "facilitator" | "student";
  onChangeCoverColor: () => void;
  onChangeProfilePhoto: () => void;
}

export default function ProfileBanner({
  user,
  role,
  onChangeCoverColor,
  onChangeProfilePhoto,
}: ProfileBannerProps) {
  const online = useOnlineStatus();
  const initial = user.firstName?.charAt(0).toUpperCase() ?? "?";

  // Admins get an amber/orange gradient, facilitators get purple/indigo
  // (matches the Facilitators.tsx table avatar), and students keep the
  // existing solid blue (matches Student.tsx / AddStudentModal avatars).
  const fallbackClass =
    role === "admin"
      ? "bg-linear-to-br from-amber-400 to-orange-500"
      : role === "facilitator"
        ? "bg-linear-to-br from-purple-400 to-indigo-500"
        : "bg-blue-500";

  return (
    <div
      className="relative h-64 md:h-80 rounded-b-3xl shadow-lg"
      style={{ backgroundColor: user.coverColor }}
    >
      {/* Avatar + camera button */}
      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="User avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center text-white font-bold text-5xl md:text-6xl ${fallbackClass}`}
              >
                {initial}
              </div>
            )}
          </div>
          <button
            onClick={onChangeProfilePhoto}
            disabled={!online}
            className="absolute bottom-1 right-1 p-2 disabled:cursor-not-allowed bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 cursor-pointer transition-all"
            title="Change Profile Photo"
          >
            <Camera size={16} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Change Cover Color button */}
      <button
        onClick={onChangeCoverColor}
        disabled={!online}
        className="absolute top-6 right-6 p-3 disabled:cursor-not-allowed bg-white/30 hover:bg-white/50 dark:bg-gray-800/50 dark:hover:bg-gray-700/70 rounded-full cursor-pointer"
        title="Change Cover Color"
      >
        <Edit2 size={20} className="text-white" />
      </button>
    </div>
  );
}
