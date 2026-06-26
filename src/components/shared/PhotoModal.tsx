// src/components/students/profile/PhotoModal.tsx
import { X, Check } from "lucide-react";
import { useShopStore } from "@/stores/useShopStore";
import { useStudentStore } from "@/stores/useStudentStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Role } from "@/types/types";

interface PhotoModalProps {
  type: "profile" | "cover";
  allCoverColors: string[];
  defaultCoverColors: string[];
  unlockAll?: boolean;
  role?: Role;
  userInitial?: string; // ← override for non-student callers (admin/facilitator)
  onSelectCoverColor: (color: string) => void;
  onSelectProfilePicture: (avatarUrl: string) => void;
  onClose: () => void;
}

type AvatarOption =
  | { id: "default"; name: string; kind: "default" }
  | { id: string; name: string; kind: "image"; src: string };

export default function PhotoModal({
  type,
  allCoverColors,
  defaultCoverColors,
  unlockAll = false,
  role,
  userInitial,
  onSelectCoverColor,
  onSelectProfilePicture,
  onClose,
}: PhotoModalProps) {
  const { items } = useShopStore();
  const { currentStudent } = useStudentStore();
  const online = useOnlineStatus();

  // ── Profile Avatar options ───────────────────────────────────────────────
  const ownedAvatars = items.filter(
    (item): item is Extract<typeof item, { category: "Profile Avatar" }> => {
      if (item.category !== "Profile Avatar") return false;
      if (item.targetRole && item.targetRole !== role) return false;
      if (!unlockAll && !currentStudent?.accessoriesOwned.includes(item.id))
        return false;
      return true;
    },
  );

  const currentPicture = currentStudent?.profilePicture || null;
  const initial =
    (userInitial || currentStudent?.firstName)?.charAt(0).toUpperCase() ?? "?";

  // Admins get an amber/orange gradient, facilitators get purple/indigo
  // (matches ProfileBanner and the Facilitators.tsx table avatar), and
  // students keep the existing solid blue (matches Student.tsx).
  const defaultAvatarClass =
    role === "admin"
      ? "bg-linear-to-br from-amber-400 to-orange-500"
      : role === "facilitator"
        ? "bg-linear-to-br from-purple-400 to-indigo-500"
        : "bg-blue-500";

  const avatarOptions: AvatarOption[] = [
    { id: "default", name: "Default", kind: "default" },
    ...ownedAvatars.map(
      (item): AvatarOption => ({
        id: String(item.id),
        name: item.name,
        kind: "image",
        src: item.avatar,
      }),
    ),
  ];

  // ── Cover Color options ──────────────────────────────────────────────────
  const ownedCoverColorItems = items.filter(
    (item): item is Extract<typeof item, { category: "Cover Photo Color" }> =>
      item.category === "Cover Photo Color" &&
      (unlockAll ||
        (currentStudent?.accessoriesOwned.includes(item.id) ?? false)),
  );
  const ownedColorHexes = new Set(
    ownedCoverColorItems.map((item) => item.color.toUpperCase()),
  );

  const displayedCoverColors = unlockAll
    ? [
        ...defaultCoverColors,
        ...ownedCoverColorItems
          .map((item) => item.color)
          .filter(
            (hex) =>
              !defaultCoverColors
                .map((c) => c.toUpperCase())
                .includes(hex.toUpperCase()),
          ),
      ]
    : allCoverColors;

  const isColorUnlocked = (hex: string) =>
    unlockAll ||
    defaultCoverColors
      .map((c) => c.toUpperCase())
      .includes(hex.toUpperCase()) ||
    ownedColorHexes.has(hex.toUpperCase());

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 max-w-3xl w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {type === "profile" ? "Choose Profile Photo" : "Choose Cover Color"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* ── Cover Color picker ─────────────────────────────────────────── */}
        {type === "cover" && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {unlockAll
                ? "Default colors and all colors available in the Shop."
                : "The first 3 colors are free. Purchase more from the Shop to unlock additional colors."}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 max-h-96 overflow-y-auto pr-1">
              {displayedCoverColors.filter(isColorUnlocked).map((color) => {
                const isActive =
                  (currentStudent?.coverColor ?? "").toUpperCase() ===
                  color.toUpperCase();

                return (
                  <button
                    key={color}
                    onClick={() => onSelectCoverColor(color)}
                    disabled={!online}
                    className={`group relative w-full h-24 rounded-xl border-2 disabled:cursor-not-allowed overflow-hidden shadow-sm transition-all cursor-pointer ${
                      isActive
                        ? "border-blue-500 dark:border-blue-400"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-500 rounded-full p-0.5">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    {!isActive && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <span className="text-white font-medium text-sm bg-black/60 px-4 py-2 rounded-lg">
                          Select
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {!unlockAll &&
              allCoverColors.filter((c) => !isColorUnlocked(c)).length > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
                  {allCoverColors.filter((c) => !isColorUnlocked(c)).length}{" "}
                  more color
                  {allCoverColors.filter((c) => !isColorUnlocked(c)).length > 1
                    ? "s"
                    : ""}{" "}
                  available in the Shop
                </p>
              )}
          </>
        )}

        {/* ── Profile Avatar picker ──────────────────────────────────────── */}
        {type === "profile" && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Your default photo and avatars purchased from the Shop appear
              here.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-96 overflow-y-auto pr-1">
              {avatarOptions.map((option) => {
                const isActive =
                  option.kind === "default"
                    ? !currentPicture
                    : currentPicture === option.src;

                return (
                  <button
                    key={option.id}
                    onClick={() =>
                      onSelectProfilePicture(
                        option.kind === "default" ? "" : option.src,
                      )
                    }
                    disabled={!online}
                    className={`group relative w-full aspect-square rounded-xl border-2 cursor-pointer disabled:cursor-not-allowed overflow-hidden shadow-sm transition-all ${
                      isActive
                        ? "border-blue-500 dark:border-blue-400"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
                    }`}
                  >
                    {option.kind === "default" ? (
                      <div
                        className={`w-full h-full flex items-center justify-center text-white font-bold text-3xl ${defaultAvatarClass}`}
                      >
                        {initial}
                      </div>
                    ) : (
                      <img
                        src={option.src}
                        alt={option.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-500 rounded-full p-0.5">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    {!isActive && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <span className="text-white font-medium text-sm bg-black/60 px-3 py-1.5 rounded-lg">
                          Select
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1">
                      <p className="text-white text-xs truncate text-center">
                        {option.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 rounded-lg font-medium cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
