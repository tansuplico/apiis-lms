// src/pages/admin/Profile.tsx
import { useState } from "react";
import ProfileBanner from "@/components/shared/ProfileBanner";
import { toast } from "react-toastify";
import PersonalInfo from "@/components/shared/PersonalInfo";
import Security from "@/components/shared/Security";
import PhotoModal from "@/components/shared/PhotoModal";
import { useAdminStore } from "@/stores/useAdminStore";
import { Navigate } from "react-router-dom";

const DEFAULT_COVER_COLORS = ["#3B82F6", "#10B981", "#8B5CF6"];

export default function Profile() {
  // ── Store
  const { currentAdmin, updateProfile } = useAdminStore();

  // ── State: photo/cover modal
  const [showModal, setShowModal] = useState<"profile" | "cover" | null>(null);

  // ── Guard: redirect if not authenticated
  if (!currentAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  // ── Handlers: update cover / profile picture
  const handleSelectCoverColor = (color: string) => {
    updateProfile({ coverColor: color });
    setShowModal(null);
    toast.success("Cover color updated!", {
      position: "bottom-right",
      autoClose: 3000,
      theme: "colored",
    });
  };

  const handleSelectProfilePicture = (avatarUrl: string) => {
    updateProfile({ profilePicture: avatarUrl || "" });
    setShowModal(null);
    toast.success("Profile photo updated!", {
      position: "bottom-right",
      autoClose: 3000,
      theme: "colored",
    });
  };

  // ── Render
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <ProfileBanner
        user={currentAdmin}
        role={"admin"}
        onChangeCoverColor={() => setShowModal("cover")}
        onChangeProfilePhoto={() => setShowModal("profile")}
      />

      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {currentAdmin.firstName} {currentAdmin.lastName}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">Admin</p>
        </div>

        <PersonalInfo role="admin" />
        <Security role="admin" />
      </div>

      {showModal && (
        <PhotoModal
          type={showModal}
          allCoverColors={DEFAULT_COVER_COLORS}
          defaultCoverColors={DEFAULT_COVER_COLORS}
          unlockAll={true}
          role="admin"
          userInitial={currentAdmin.firstName}
          onSelectCoverColor={handleSelectCoverColor}
          onSelectProfilePicture={handleSelectProfilePicture}
          onClose={() => setShowModal(null)}
        />
      )}
    </div>
  );
}
