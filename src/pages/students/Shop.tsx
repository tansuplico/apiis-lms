// src/pages/students/Shop.tsx
import { ChevronDown, Gem, Search, Loader2 } from "lucide-react";
import shop from "../../assets/shop.png";
import { useState, useEffect } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { Accessory, AccessoryCategory } from "@/types/types";
import { useStudentStore } from "@/stores/useStudentStore";
import { useShopStore } from "@/stores/useShopStore";
import { toast } from "react-toastify";
import { Navigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";

const CATEGORIES: AccessoryCategory[] = ["Cover Photo Color", "Profile Avatar"];
type CategoryFilter = "Cover Photo Color" | "Profile Avatar" | "All";

export default function Shop() {
  // ── Store
  const { currentStudent } = useStudentStore();
  const { items, isLoading, fetchItems } = useShopStore();

  // ── State
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("All");
  const [searchText, setSearchText] = useState("");
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState(false);
  // ── Derived: loading condition
  const showLoading = isLoading && items.length === 0;

  const debouncedSearch = useDebounce(searchText, 300);

  // ── Effects: load shop items
  useEffect(() => {
    fetchItems().catch(() => setFetchError(true));
  }, []);

  // ── Guard: redirect if not logged in
  if (!currentStudent) {
    return <Navigate to="/student/login" replace />;
  }

  // ── Derived: filtered items
  const filteredItems = items.filter((item) => {
    if (
      item.category === "Profile Avatar" &&
      item.targetRole &&
      item.targetRole !== "student"
    )
      return false;
    const matchesSearch = item.name
      .toLowerCase()
      .includes(debouncedSearch.toLowerCase().trim());
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isOwned = (itemId: number) =>
    currentStudent.accessoriesOwned.includes(itemId);

  // ── Handlers: purchase
  const handlePurchase = async (item: Accessory) => {
    if (isOwned(item.id)) return;

    if (currentStudent.coins < item.price) {
      toast.error(
        `Not enough gems! You need ${item.price - currentStudent.coins} more gems.`,
        { position: "bottom-right", autoClose: 5000 },
      );
      return;
    }

    setPurchasingId(item.id);
    try {
      const success = await useStudentStore
        .getState()
        .purchaseAccessory(item.id, item.price);
      if (success) {
        toast.success(`Purchased ${item.name}!`, {
          position: "bottom-right",
          autoClose: 3000,
        });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Purchase failed. Please try again.", {
        position: "bottom-right",
      });
    } finally {
      setPurchasingId(null);
    }
  };

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 pb-10">
      {/* Hero Banner */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#80BC04] dark:bg-[#5e8f03] text-white p-8 md:p-12 rounded-2xl overflow-hidden shadow-lg">
        <div className="max-w-lg">
          <h3 className="text-4xl md:text-5xl font-bold mb-4">Shop</h3>
          <p className="text-lg md:text-xl opacity-95">
            Exchange your hard-earned gems for profile{" "}
            <br className="hidden md:block" />
            accessories and customizations
          </p>
        </div>
        <img
          src={shop}
          alt="Shop illustration"
          className="w-48 md:w-64 lg:w-80 mt-6 md:mt-0"
        />
      </div>

      {/* Search + Category */}
      <div className="flex flex-col sm:flex-row py-10 justify-between items-start sm:items-center gap-4">
        <div className="flex-1 flex items-center gap-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3.5 rounded-xl focus-within:border-[#0070FF] dark:focus-within:border-blue-500">
          <Search
            size={20}
            strokeWidth={1.8}
            className="text-gray-500 dark:text-gray-400"
          />
          <input
            type="text"
            placeholder="Search an accessory..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              ×
            </button>
          )}
        </div>

        <Listbox value={selectedCategory} onChange={setSelectedCategory}>
          <div className="relative w-full sm:w-60">
            <ListboxButton className="relative w-full flex items-center justify-between gap-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-[#0070FF] dark:hover:bg-blue-700 hover:text-white px-5 py-3.5 rounded-xl font-medium border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0070FF]/50 dark:focus:ring-blue-500/50">
              <span className="block truncate">{selectedCategory}</span>
              <ChevronDown size={18} strokeWidth={2} className="opacity-70" />
            </ListboxButton>
            <ListboxOptions
              modal={false}
              className="absolute mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-72 overflow-auto z-50 focus:outline-none"
            >
              {(["All", ...CATEGORIES] as const).map((cat) => (
                <ListboxOption
                  key={cat}
                  value={cat}
                  className={({ active, selected }) =>
                    `relative cursor-pointer select-none py-3 px-5 text-gray-900 dark:text-gray-100 transition-colors ${
                      active ? "bg-[#0070FF] dark:bg-blue-700 text-white" : ""
                    } ${selected ? "font-medium" : ""}`
                  }
                >
                  {cat}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </Listbox>
      </div>

      {/* Loading state */}
      {showLoading && (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 size={22} className="animate-spin" />
          <span>Loading shop items...</span>
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
            className="px-5 py-2.5 bg-[#0070FF] text-white rounded-xl font-medium hover:bg-[#0063e4] transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Items Grid */}
      {!showLoading && !fetchError && (
        <>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No accessories found matching your search or category.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => {
                const owned = isOwned(item.id);
                const isPurchasing = purchasingId === item.id;
                const canAfford =
                  Number(currentStudent.coins) >= Number(item.price);
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl dark:hover:shadow-2xl border border-gray-100 dark:border-gray-700 group flex flex-col"
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
                      <div className="mb-5 flex-1">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                          {item.category}
                        </h4>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <Gem
                            size={20}
                            strokeWidth={1.6}
                            className="text-amber-600 dark:text-amber-400"
                          />
                          <span className="font-medium">{item.price}</span>
                        </div>
                      </div>

                      {owned ? (
                        <div className="w-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 py-3 rounded-xl font-medium text-center text-sm">
                          Owned
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={isPurchasing || !canAfford}
                          className="w-full flex items-center justify-center gap-2 bg-[#0070FF] hover:bg-[#0059CC] dark:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium shadow-sm cursor-pointer transition-all"
                        >
                          {isPurchasing && (
                            <Loader2 size={16} className="animate-spin" />
                          )}
                          {!canAfford ? "Not enough gems" : "Purchase"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
