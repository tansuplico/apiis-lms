import { Check } from "lucide-react";

export default function SelectionOverlay() {
  return (
    <div className="absolute inset-0 bg-green-600/20 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-full p-3">
        <Check size={32} className="text-green-600 dark:text-green-400" />
      </div>
    </div>
  );
}
