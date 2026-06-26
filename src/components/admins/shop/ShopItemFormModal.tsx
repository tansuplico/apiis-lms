// src/components/admins/shop/ShopItemFormModal.tsx
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, X, Loader2 } from "lucide-react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { toast } from "react-toastify";
import { Accessory, AccessoryCategory, Role } from "@/types/types";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const COLOR_SWATCHES = [
  "#3B82F6",
  "#0070FF",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#F97316",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#84CC16",
  "#6B7280",
  "#1F2937",
  "#000000",
  "#FFFFFF",
];

const CATEGORIES: AccessoryCategory[] = ["Cover Photo Color", "Profile Avatar"];

type FormState = {
  name: string;
  category: AccessoryCategory;
  price: string;
  color: string;
  avatarFile: File | null;
  avatarPreview: string;
  targetRole: Role | null;
};

const EMPTY_FORM: FormState = {
  name: "",
  category: "Cover Photo Color",
  price: "",
  color: COLOR_SWATCHES[0],
  avatarFile: null,
  avatarPreview: "",
  targetRole: null,
};

interface Props {
  isOpen: boolean;
  editingItem: Accessory | null;
  onSave: (data: FormState & { avatarBase64?: string }) => Promise<void>;
  onClose: () => void;
}

function compressImage(
  file: File,
  maxWidth = 256,
  quality = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = url;
  });
}

export default function ShopItemFormModal({
  isOpen,
  editingItem,
  onSave,
  onClose,
}: Props) {
  // ── Store
  const online = useOnlineStatus();

  // ── State: form
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // ── Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string>("");

  // ── Effects: initialise form on open
  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setForm({
          name: editingItem.name,
          category: editingItem.category,
          price: String(editingItem.price),
          color:
            editingItem.category === "Cover Photo Color"
              ? editingItem.color
              : COLOR_SWATCHES[0],
          avatarFile: null,
          avatarPreview:
            editingItem.category === "Profile Avatar" ? editingItem.avatar : "",
          targetRole:
            editingItem.category === "Profile Avatar"
              ? (editingItem.targetRole ?? null)
              : null,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [isOpen, editingItem]);

  // ── Derived
  const isFormValid =
    form.name.trim() !== "" &&
    form.price !== "" &&
    Number(form.price) > 0 &&
    (form.category === "Cover Photo Color"
      ? form.color !== ""
      : form.avatarPreview !== "");

  // ── Handlers
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const preview = URL.createObjectURL(file);
    previewUrlRef.current = preview;
    setForm((f) => ({ ...f, avatarFile: file, avatarPreview: preview }));
  };

  const handleCategoryChange = (cat: AccessoryCategory) => {
    setForm((f) => ({
      ...f,
      category: cat,
      avatarFile: null,
      avatarPreview: "",
      color: COLOR_SWATCHES[0],
      targetRole: null,
    }));
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSaving) return;
    setIsSaving(true);
    try {
      let avatarBase64: string | undefined;
      if (form.category === "Profile Avatar" && form.avatarFile) {
        const compressToast = toast.loading("Compressing image...", {
          position: "bottom-right",
        });
        avatarBase64 = await compressImage(form.avatarFile);
        toast.dismiss(compressToast);
      }
      await onSave({ ...form, avatarBase64 });
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.", {
        position: "bottom-right",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Guard: modal closed
  if (!isOpen) return null;

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingItem ? "Edit Item" : "Add New Item"}
          </h3>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            {editingItem ? (
              <div className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
                {form.category}
              </div>
            ) : (
              <Listbox value={form.category} onChange={handleCategoryChange}>
                <div className="relative">
                  <ListboxButton className="relative w-full flex items-center justify-between gap-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-lg font-normal border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <span>{form.category}</span>
                    <ChevronDown size={16} className="opacity-60" />
                  </ListboxButton>
                  <ListboxOptions className="absolute mt-1 w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 focus:outline-none overflow-hidden">
                    {CATEGORIES.map((cat) => (
                      <ListboxOption
                        key={cat}
                        value={cat}
                        className={({ active }) =>
                          `cursor-pointer select-none py-2.5 px-4 text-sm text-gray-900 dark:text-gray-100 ${active ? "bg-[#0070FF] text-white" : ""}`
                        }
                      >
                        {cat}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </div>
              </Listbox>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Ocean Blue, Pixel Fox..."
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Price (coins) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.price}
              onChange={(e) =>
                setForm((f) => ({ ...f, price: e.target.value }))
              }
              placeholder="e.g. 150"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Color picker */}
          {form.category === "Cover Photo Color" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {COLOR_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setForm((f) => ({ ...f, color: hex }))}
                    className="w-8 h-8 rounded-lg border-2 transition-all cursor-pointer"
                    style={{
                      backgroundColor: hex,
                      borderColor:
                        form.color === hex ? "#0070FF" : "transparent",
                      boxShadow:
                        form.color === hex ? "0 0 0 2px #0070FF" : "none",
                      outline: hex === "#FFFFFF" ? "1px solid #d1d5db" : "none",
                    }}
                    title={hex}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="w-12 h-8 rounded-lg border border-gray-200 dark:border-gray-600"
                  style={{ backgroundColor: form.color }}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {form.color}
                </span>
              </div>
            </div>
          )}

          {/* Avatar upload */}
          {form.category === "Profile Avatar" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Avatar Image <span className="text-red-500">*</span>
                {editingItem && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    (leave unchanged to keep current image)
                  </span>
                )}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden disabled:cursor-not-allowed"
                disabled={!online}
                onChange={handleAvatarUpload}
              />
              {form.avatarPreview ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 group">
                  <img
                    src={form.avatarPreview}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => !online && fileInputRef.current?.click()}
                    disabled={!online}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!online}
                  className="w-full h-32 rounded-xl border-2 border-dashed disabled:cursor-not-allowed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 transition-colors cursor-pointer"
                >
                  <Plus size={24} />
                  <span className="text-sm font-medium">Upload image</span>
                  <span className="text-xs">PNG, JPG, WebP</span>
                </button>
              )}
            </div>
          )}

          {form.category === "Profile Avatar" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Visible To
              </label>
              <div className="flex gap-2">
                {([null, "admin", "facilitator"] as (Role | null)[]).map(
                  (role) => (
                    <button
                      key={role ?? "all"}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, targetRole: role }))
                      }
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                        form.targetRole === role
                          ? "bg-[#0070FF] border-[#0070FF] text-white"
                          : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400"
                      }`}
                    >
                      {role === null
                        ? "All roles"
                        : role === "admin"
                          ? "Admin only"
                          : "Facilitator only"}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-7">
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || isSaving || !online}
            className="flex-1 flex items-center justify-center gap-2 bg-[#0070FF] hover:bg-[#0063e4] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            {editingItem ? "Save Changes" : "Add Item"}
          </button>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
