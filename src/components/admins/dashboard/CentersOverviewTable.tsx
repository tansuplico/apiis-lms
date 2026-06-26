// src/components/admins/dashboard/CentersOverviewTable.tsx
import { Center, Facilitator } from "@/types/types";

interface Props {
  centers: Center[];
  facilitators: Facilitator[];
}

export default function CentersOverviewTable({ centers, facilitators }: Props) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 md:p-8 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          All Centers Overview
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr className="text-center">
              <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Center Name
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Facilitator
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Students
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Courses
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-center">
            {centers.map((center) => (
              <tr
                key={center.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  {center.title}
                </td>
                <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                  {center.facilitatorIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {center.facilitatorIds.map((fId) => {
                        const f = facilitators.find((f) => f.id === fId);
                        return f ? (
                          <span
                            key={fId}
                            className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                          >
                            {f.firstName} {f.lastName}
                          </span>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                  {center.students?.length || 0}
                </td>
                <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                  {center.courses?.length || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
