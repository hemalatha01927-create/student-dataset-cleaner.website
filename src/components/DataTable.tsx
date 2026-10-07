import { useMemo, useState } from "react";
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { Dataset } from "@/lib/types";
import { isMissing } from "@/lib/analysis";

interface Props {
  dataset: Dataset;
  highlightMissing?: boolean;
  emptyMessage?: string;
}

type SortDir = "asc" | "desc" | null;

export default function DataTable({
  dataset,
  highlightMissing = false,
  emptyMessage = "No data to display.",
}: Props) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const filtered = useMemo(() => {
    if (dataset.rows.length === 0) return [];
    let rows = dataset.rows.map((r, i) => ({ row: r, index: i }));

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(({ row }) =>
        row.some((v) => String(v).toLowerCase().includes(q))
      );
    }

    if (sortCol !== null && sortDir !== null) {
      rows.sort((a, b) => {
        const av = a.row[sortCol];
        const bv = b.row[sortCol];
        const an = Number(av);
        const bn = Number(bv);
        let cmp: number;
        if (!isNaN(an) && !isNaN(bn) && !isMissing(av) && !isMissing(bv)) {
          cmp = an - bn;
        } else {
          cmp = String(av).localeCompare(String(bv));
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [dataset, search, sortCol, sortDir]);

  const toggleSort = (col: number) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortCol(null);
      setSortDir(null);
    } else {
      setSortDir("asc");
    }
  };

  if (dataset.rows.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search rows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">
                #
              </th>
              {dataset.headers.map((h, c) => (
                <th
                  key={c}
                  onClick={() => toggleSort(c)}
                  className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    {h}
                    {sortCol === c && sortDir === "asc" ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : sortCol === c && sortDir === "desc" ? (
                      <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ row, index }) => (
              <tr
                key={index}
                className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"
              >
                <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                  {index + 1}
                </td>
                {row.map((v, c) => (
                  <td
                    key={c}
                    className={`px-3 py-2 whitespace-nowrap ${
                      highlightMissing && isMissing(v)
                        ? "bg-red-50 text-red-500 font-medium"
                        : "text-slate-700"
                    }`}
                  >
                    {isMissing(v) ? "—" : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        Showing {filtered.length} of {dataset.rows.length} rows
      </p>
    </div>
  );
}
