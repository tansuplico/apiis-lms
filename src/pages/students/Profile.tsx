// src/pages/students/Profile.tsx
import { useState } from "react";
import ProfileBanner from "@/components/shared/ProfileBanner";
import { toast } from "react-toastify";
import PersonalInfo from "@/components/shared/PersonalInfo";
import Security from "@/components/shared/Security";
import PhotoModal from "@/components/shared/PhotoModal";
import { useStudentStore } from "@/stores/useStudentStore";
import { useShopStore } from "@/stores/useShopStore";
import { Navigate } from "react-router-dom";

const DEFAULT_COVER_COLORS = ["#3B82F6", "#10B981", "#8B5CF6"];

export default function Profile() {
  // ── Store
  const { currentStudent, updateProfile } = useStudentStore();
  const { items } = useShopStore();

  // ── State
  const [showModal, setShowModal] = useState<"profile" | "cover" | null>(null);

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
  const handleSelectProfilePicture = async (avatarUrl: string) => {
    setShowModal(null);
    const success = await updateProfile({ profilePicture: avatarUrl });
    if (!success) return; // error toast already handled by the store
    toast.success("Profile photo updated!", {
      position: "bottom-right",
      autoClose: 3000,
      theme: "colored",
    });
  };

  const handleSelectCoverColor = async (color: string) => {
    setShowModal(null);
    const success = await updateProfile({ coverColor: color });
    if (!success) return; // error toast already handled by the store
    toast.success("Cover color updated!", {
      position: "bottom-right",
      autoClose: 3000,
      theme: "colored",
    });
  };

  // ── Render
  return (
    <div className="min-h-screen  text-gray-900 dark:text-gray-100">
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
    </div>
  );
}
