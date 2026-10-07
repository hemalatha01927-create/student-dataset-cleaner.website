import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent: "blue" | "purple" | "amber" | "green";
}

const accentMap = {
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  amber: "bg-amber-50 text-amber-600",
  green: "bg-emerald-50 text-emerald-600",
};

export default function StatCard({ label, value, icon, accent }: Props) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${accentMap[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
