// src/components/shared/StatCard.tsx
import React from "react";
import { Link } from "react-router-dom";

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: "blue" | "green" | "purple" | "orange" | "yellow" | "gray";
  link?: string;
}

const bgColors = {
  blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  purple:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  orange:
    "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  yellow:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
  gray: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
};

const baseClass =
  "bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow";

export default function StatCard({
  icon,
  title,
  value,
  color,
  link,
}: StatCardProps) {
  // ── Render
  const content = (
    <div className="flex items-center gap-4">
      <div className={`p-4 rounded-lg ${bgColors[color]}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        <p className="text-3xl text-gray-900 dark:text-white mt-1">{value}</p>
      </div>
    </div>
  );

  if (link) {
    return (
      <Link
        to={link}
        className={`${baseClass} hover:border-blue-300 dark:hover:border-blue-600 group`}
      >
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
