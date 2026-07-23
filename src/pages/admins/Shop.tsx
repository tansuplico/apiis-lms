// src/pages/admin/Shop.tsx
import { Coins, Search, Plus, Pencil, Trash2 } from "lucide-react";
import shop from "../../assets/shop.png";
import { useState, useEffect } from "react";
import { Accessory, AccessoryCategory } from "@/types/types";
import { useShopStore } from "@/stores/useShopStore";
import { toast } from "react-toastify";
import { useDebounce } from "@/hooks/useDebounce";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import ShopItemFormModal from "@/components/admins/shop/ShopItemFormModal";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal";

const CATEGORIES: AccessoryCategory[] = ["Cover Photo Color", "Profile Avatar"];
const SKELETON_COUNT = 8;

// ── Sub-component: ShopItemSkeleton
function ShopItemSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700 flex flex-col">
      <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="p-5 flex flex-col flex-1">
        <div className="mb-4 flex-1 space-y-3">
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex gap-2 mt-auto">
          <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function AdminShop() {
  // ── Store
  const { items, isLoading, fetchItems, addItem, editItem, removeItem } =
    useShopStore();

  const [selectedCategory, setSelectedCategory] = useState<
    AccessoryCategory | "All"
  >("All");
  const [searchText, setSearchText] = useState("");
  const online = useOnlineStatus();

  // ── Modal state: add/edit item
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Accessory | null>(null);

  // ── Modal state: delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Accessory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const showLoading = isLoading && items.length === 0;
  // ── Effects: fetch items on mount
  useEffect(() => {
    fetchItems().catch(() => setFetchError(true));
  }, []);

  // ── Derived: filtered items
  const debouncedSearch = useDebounce(searchText, 300);
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(debouncedSearch.toLowerCase().trim());
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ── Handlers: open/close modals
  const openAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const openEdit = (item: Accessory) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const openDelete = (item: Accessory) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  // ── Handlers: save (add/edit)
  const handleSave = async (data: any) => {
    if (data.category === "Cover Photo Color") {
      const payload = {
        name: data.name,
        category: "Cover Photo Color" as const,
        price: Number(data.price),
        color: data.color,
      };
      if (editingItem) {
        await editItem(editingItem.id, {
          name: payload.name,
          price: payload.price,
          color: payload.color,
        });
        toast.success(`"${payload.name}" updated successfully.`);
      } else {
        await addItem(payload);
        toast.success(`"${payload.name}" added to the shop.`);
      }
    } else {
      const payload = {
        name: data.name,
        category: "Profile Avatar" as const,
        price: Number(data.price),
        avatarUrl:
          data.avatarBase64 || (editingItem ? (editingItem as any).avatar : ""),
        targetRole: data.targetRole ?? null,
      };
      if (editingItem) {
        const updatePayload: any = {
          name: payload.name,
          price: payload.price,
          targetRole: payload.targetRole,
        };
        if (data.avatarBase64) updatePayload.avatarUrl = payload.avatarUrl;
        await editItem(editingItem.id, updatePayload);
        toast.success(`"${payload.name}" updated successfully.`);
      } else {
        await addItem(payload);
        toast.success(`"${payload.name}" added to the shop.`);
      }
    }
  };

  // ── Handlers: delete confirmation
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await removeItem(itemToDelete.id);
      toast.success(`"${itemToDelete.name}" removed from the shop.`);
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete item.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 pb-10">
      {/* Hero Banner */}
      <div className="flex flex-row justify-between items-center bg-[#80BC04] dark:bg-[#5e8f03] text-white p-7 md:p-12 rounded-2xl overflow-hidden shadow-lg">
        <div className="max-w-lg">
          <h3 className="text-3xl md:text-4xl font-bold mb-3">Shop</h3>
          <p className="text-base md:text-lg opacity-95">
            Manage shop items add, edit, or remove profile accessories and
            customizations
          </p>
        </div>
        <img
          src={shop}
          alt="Shop illustration"
          className="w-28 md:w-65 shrink-0 ml-4"
        />
      </div>

      {/* Search + Category + Add Button */}
      <div className="flex flex-col sm:flex-row py-10 justify-between items-start sm:items-center gap-3">
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="w-full sm:w-72 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg">
            <Search size={20} className="text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search an accessory..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                ×
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as AccessoryCategory | "All")
            }
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-3 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Add Item Button */}
        <button
          onClick={openAdd}
          disabled={!online}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all shrink-0 ${
            online
              ? "bg-[#0070FF] hover:bg-[#0063e4] text-white cursor-pointer shadow-md hover:shadow-lg"
              : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          }`}
        >
          <Plus size={20} />
          Add Item
        </button>
      </div>

      {/* Loading state */}
      {showLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <ShopItemSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!showLoading && fetchError && (
        <div className="text-center py-12">
          <p className="text-red-500 dark:text-red-400 mb-4">
            Failed to load shop items.
          </p>
          <button
            onClick={() => {
              setFetchError(false);
              fetchItems().catch(() => setFetchError(true));
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Item grid */}
      {!showLoading && !fetchError && (
        <>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No accessories found matching your search or category.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl border border-gray-100 dark:border-gray-700 group flex flex-col"
                >
                  {/* Thumbnail */}
                  <div
                    className="w-full h-48 overflow-hidden"
                    style={{
                      backgroundColor:
                        item.category === "Cover Photo Color"
                          ? item.color
                          : undefined,
                    }}
                  >
                    {item.category === "Profile Avatar" && (
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="mb-4 flex-1">
                      <h4 className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                        {item.category}
                      </h4>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Coins
                          size={20}
                          strokeWidth={1.6}
                          className="text-amber-600 dark:text-amber-400"
                        />
                        <span className="font-medium">{item.price}</span>
                      </div>
                    </div>

                    {/* Admin actions */}
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => openEdit(item)}
                        disabled={!online}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-800 dark:text-gray-200 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
                      <button
                        onClick={() => openDelete(item)}
                        disabled={!online}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-40 disabled:cursor-not-allowed text-red-600 dark:text-red-400 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showModal && (
        <ShopItemFormModal
          isOpen={showModal}
          editingItem={editingItem}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {showDeleteModal && itemToDelete && (
        <DeleteConfirmModal
          title="Delete Item?"
          message="Are you sure you want to permanently remove this item from the shop?"
          itemName={itemToDelete?.name || ""}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteModal(false);
            setItemToDelete(null);
          }}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
