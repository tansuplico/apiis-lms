// src/components/shared/FilterDropdown.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface FilterDropdownOption {
  value: string;
  label: string;
}

export default function FilterDropdown({
  value,
  onChange,
  options,
  icon,
  active,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterDropdownOption[];
  icon: ReactNode;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? options[0]?.label ?? "";

  return (
    <div className="relative z-98" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm border whitespace-nowrap transition-colors ${
          active
            ? "bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
            : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
      >
        {icon}
        {selectedLabel}
        <ChevronDown
          size={14}
          className={active ? "text-white" : "text-gray-500 dark:text-gray-400"}
        />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden py-1">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                o.value === value
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
