// src/pages/students/Profile.tsx
import { useState } from "react";
import ProfileBanner from "@/components/shared/ProfileBanner";
import { toast } from "react-toastify";
import PersonalInfo from "@/components/shared/PersonalInfo";
import Security from "@/components/shared/Security";
import PhotoModal from "@/components/shared/PhotoModal";
import TicketModal from "@/components/shared/TicketModal";
import { useStudentStore } from "@/stores/useStudentStore";
import { useShopStore } from "@/stores/useShopStore";
import { Navigate } from "react-router-dom";
import { TicketCheck } from "lucide-react";

const DEFAULT_COVER_COLORS = ["#3B82F6", "#10B981", "#8B5CF6"];

export default function Profile() {
  // ── Store
  const { currentStudent, updateProfile } = useStudentStore();
  const { items } = useShopStore();

  // ── State
  const [showModal, setShowModal] = useState<"profile" | "cover" | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // ── Guard: redirect if not authenticated
  if (!currentStudent) {
    return <Navigate to="/student/login" replace />;
  }

  // ── Derived: available cover colors (defaults + purchased)
  const shopCoverColors = items
    .filter(
      (item): item is Extract<typeof item, { category: "Cover Photo Color" }> =>
        item.category === "Cover Photo Color",
    )
    .map((item) => item.color)
    .filter(
      (hex) =>
        !DEFAULT_COVER_COLORS.map((c) => c.toUpperCase()).includes(
          hex.toUpperCase(),
        ),
    );

  const allCoverColors = [...DEFAULT_COVER_COLORS, ...shopCoverColors];

  // ── Handlers
  const handleSelectProfilePicture = (avatarUrl: string) => {
    updateProfile({ profilePicture: avatarUrl });
    setShowModal(null);
    toast.success("Profile photo updated!", {
      position: "bottom-right",
      autoClose: 3000,
      theme: "colored",
    });
  };

  const handleSelectCoverColor = (color: string) => {
    updateProfile({ coverColor: color });
    setShowModal(null);
    toast.success("Cover color updated!", {
      position: "bottom-right",
      autoClose: 3000,
      theme: "colored",
    });
  };

  // ── Render
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <ProfileBanner
        user={currentStudent}
        role={"student"}
        onChangeCoverColor={() => setShowModal("cover")}
        onChangeProfilePhoto={() => setShowModal("profile")}
      />

      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold">
            {currentStudent.firstName} {currentStudent.lastName}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
            Student
          </p>
        </div>

        <PersonalInfo role="student" />
        <Security role="student" />

        {/* Support Ticket */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Need help?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Submit a support ticket and we'll get back to you as soon as
              possible.
            </p>
          </div>
          <button
            onClick={() => setShowTicketModal(true)}
            className="flex items-center gap-2 bg-[#0070FF] hover:bg-[#0063e4] text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer shrink-0"
          >
            <TicketCheck size={17} />
            Submit a Ticket
          </button>
        </div>
      </div>

      {showModal && (
        <PhotoModal
          type={showModal}
          allCoverColors={allCoverColors}
          defaultCoverColors={DEFAULT_COVER_COLORS}
          unlockAll={false}
          role="student"
          userInitial={currentStudent.firstName}
          onSelectCoverColor={handleSelectCoverColor}
          onSelectProfilePicture={handleSelectProfilePicture}
          onClose={() => setShowModal(null)}
        />
      )}

      {showTicketModal && (
        <TicketModal onClose={() => setShowTicketModal(false)} />
      )}
    </div>
  );
}
