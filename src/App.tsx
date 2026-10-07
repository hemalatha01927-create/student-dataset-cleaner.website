import { useState, useRef, useMemo, useCallback } from "react";
import {
  LayoutDashboard,
  Upload,
  ShieldCheck,
  Sparkles,
  Table2,
  FileSpreadsheet,
  Trash2,
  Hash,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileDown,
  BarChart3,
} from "lucide-react";
import type { Dataset, DataInsight } from "@/lib/types";
import { parseCSV, datasetToCSV } from "@/lib/csv";
import { SAMPLE_CSV } from "@/lib/sampleData";
import {
  computeStats,
  findProblems,
  columnMeta,
  isMissing,
} from "@/lib/analysis";
import {
  removeDuplicates,
  fillMissingNumeric,
  fillMissingText,
  removeEmptyRows,
  cleanDataset,
} from "@/lib/cleaning";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import ComparisonChart from "@/components/ComparisonChart";

type Tab =
  | "dashboard"
  | "upload"
  | "quality"
  | "clean"
  | "cleaned";

const EMPTY_DATASET: Dataset = { headers: [], rows: [] };

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [original, setOriginal] = useState<Dataset>(EMPTY_DATASET);
  const [cleaned, setCleaned] = useState<Dataset>(EMPTY_DATASET);
  const [fileName, setFileName] = useState<string>("");
  const [insights, setInsights] = useState<DataInsight[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasData = original.rows.length > 0;
  const hasCleaned = cleaned.rows.length > 0;

  const beforeStats = useMemo(
    () => (hasData ? computeStats(original) : null),
    [original, hasData]
  );
  const afterStats = useMemo(
    () => (hasCleaned ? computeStats(cleaned) : null),
    [cleaned, hasCleaned]
  );

  const problems = useMemo(
    () => (hasData ? findProblems(original) : []),
    [original, hasData]
  );

  const meta = useMemo(
    () => (hasData ? columnMeta(original) : []),
    [original, hasData]
  );

  const loadData = useCallback((csvText: string, name: string) => {
    const ds = parseCSV(csvText);
    setOriginal(ds);
    setCleaned(EMPTY_DATASET);
    setFileName(name);
    const stats = computeStats(ds);
    const newInsights: DataInsight[] = [];
    if (stats.missingValues > 0) {
      newInsights.push({
        message: `${stats.missingValues} missing value${
          stats.missingValues > 1 ? "s were" : " was"
        } detected.`,
        type: "warning",
      });
    }
    if (stats.duplicateRows > 0) {
      newInsights.push({
        message: `${stats.duplicateRows} duplicate row${
          stats.duplicateRows > 1 ? "s were" : " was"
        } detected.`,
        type: "warning",
      });
    }
    if (stats.cleanRows > 0) {
      newInsights.push({
        message: `${stats.cleanRows} clean row${
          stats.cleanRows > 1 ? "s" : ""
        } found with complete information.`,
        type: "success",
      });
    }
    if (newInsights.length === 0) {
      newInsights.push({
        message: "Dataset loaded. No issues detected.",
        type: "success",
      });
    }
    setInsights(newInsights);
    setTab("dashboard");
  }, []);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      loadData(String(reader.result), file.name);
    };
    reader.readAsText(file);
  };

  const handleSample = () => {
    loadData(SAMPLE_CSV, "sample_students.csv");
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const runCleanOp = (
    op: (ds: Dataset) => Dataset,
    successMsg: string
  ) => {
    if (!hasData) return;
    const result = op(original);
    setOriginal(result);
    setInsights((prev) => [
      ...prev,
      { message: successMsg, type: "success" },
    ]);
  };

  const handleRemoveDuplicates = () => {
    const before = original.rows.length;
    const result = removeDuplicates(original);
    const removed = before - result.rows.length;
    if (removed === 0) {
      setInsights((prev) => [
        ...prev,
        { message: "No duplicate rows found to remove.", type: "info" },
      ]);
      return;
    }
    setOriginal(result);
    setInsights((prev) => [
      ...prev,
      {
        message: `${removed} duplicate row${
          removed > 1 ? "s were" : " was"
        } detected and removed.`,
        type: "success",
      },
    ]);
  };

  const handleFillNumeric = () => {
    const before = computeStats(original).missingValues;
    const result = fillMissingNumeric(original);
    const after = computeStats(result).missingValues;
    const filled = before - after;
    if (filled === 0) {
      setInsights((prev) => [
        ...prev,
        { message: "No missing numeric values to fill.", type: "info" },
      ]);
      return;
    }
    setOriginal(result);
    setInsights((prev) => [
      ...prev,
      {
        message: `Missing numeric values were replaced using the column average (${filled} value${filled > 1 ? "s" : ""}).`,
        type: "success",
      },
    ]);
  };

  const handleFillText = () => {
    const before = computeStats(original).missingValues;
    const result = fillMissingText(original);
    const after = computeStats(result).missingValues;
    const filled = before - after;
    if (filled === 0) {
      setInsights((prev) => [
        ...prev,
        { message: "No missing text values to fill.", type: "info" },
      ]);
      return;
    }
    setOriginal(result);
    setInsights((prev) => [
      ...prev,
      {
        message: `Missing text values were replaced with "Unknown" (${filled} value${filled > 1 ? "s" : ""}).`,
        type: "success",
      },
    ]);
  };

  const handleRemoveEmpty = () => {
    const before = original.rows.length;
    const result = removeEmptyRows(original);
    const removed = before - result.rows.length;
    if (removed === 0) {
      setInsights((prev) => [
        ...prev,
        { message: "No empty rows found to remove.", type: "info" },
      ]);
      return;
    }
    setOriginal(result);
    setInsights((prev) => [
      ...prev,
      {
        message: `${removed} completely empty row${removed > 1 ? "s were" : " was"} removed.`,
        type: "success",
      },
    ]);
  };

  const handleCleanAll = () => {
    if (!hasData) return;
    const result = cleanDataset(original);
    const beforeStats = computeStats(original);
    const afterStats = computeStats(result);
    setCleaned(result);
    const newInsights: DataInsight[] = [...insights];
    if (beforeStats.duplicateRows > 0) {
      newInsights.push({
        message: `${beforeStats.duplicateRows} duplicate row${
          beforeStats.duplicateRows > 1 ? "s were" : " was"
        } detected and removed.`,
        type: "success",
      });
    }
    const numericFilled = meta.filter(
      (m) => m.isNumeric && m.missingCount > 0
    ).length;
    if (numericFilled > 0) {
      newInsights.push({
        message:
          "Missing numeric values were replaced using the column average.",
        type: "success",
      });
    }
    const textFilled = meta.filter(
      (m) => !m.isNumeric && m.missingCount > 0
    ).length;
    if (textFilled > 0) {
      newInsights.push({
        message: 'Missing text values were replaced with "Unknown".',
        type: "success",
      });
    }
    if (afterStats.cleanRows === afterStats.totalRows) {
      newInsights.push({
        message: "Dataset fully cleaned — all rows are now complete and valid.",
        type: "success",
      });
    }
    setInsights(newInsights);
    setTab("cleaned");
  };

  const handleDownload = () => {
    if (!hasCleaned) return;
    const csv = datasetToCSV(cleaned);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleaned_student_dataset.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "upload", label: "Upload Dataset", icon: <Upload className="w-4 h-4" /> },
    { id: "quality", label: "Data Quality", icon: <ShieldCheck className="w-4 h-4" /> },
    { id: "clean", label: "Clean Dataset", icon: <Sparkles className="w-4 h-4" /> },
    { id: "cleaned", label: "Cleaned Data", icon: <Table2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 leading-tight">
                  Student Dataset Cleaner
                </h1>
                <p className="text-xs text-slate-400 leading-tight">
                  AI &amp; Machine Learning — Dataset Cleaning
                </p>
              </div>
            </div>
            {hasData && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="font-medium text-slate-600">{fileName}</span>
                <span className="text-slate-300">·</span>
                <span>{original.rows.length} rows</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {!hasData && tab !== "upload" && (
          <EmptyState onUpload={() => setTab("upload")} onSample={handleSample} />
        )}

        {hasData && tab === "dashboard" && beforeStats && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
              <p className="text-sm text-slate-500 mt-1">
                Overview of your dataset quality at a glance.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Rows"
                value={beforeStats.totalRows}
                icon={<Hash className="w-6 h-6" />}
                accent="blue"
              />
              <StatCard
                label="Missing Values"
                value={beforeStats.missingValues}
                icon={<AlertTriangle className="w-6 h-6" />}
                accent="amber"
              />
              <StatCard
                label="Duplicate Rows"
                value={beforeStats.duplicateRows}
                icon={<Copy className="w-6 h-6" />}
                accent="purple"
              />
              <StatCard
                label="Clean Rows"
                value={beforeStats.cleanRows}
                icon={<CheckCircle2 className="w-6 h-6" />}
                accent="green"
              />
            </div>

            {insights.length > 0 && <InsightList insights={insights} />}

            {hasCleaned && afterStats && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-800">
                    Before &amp; After Cleaning
                  </h3>
                </div>
                <ComparisonChart before={beforeStats} after={afterStats} />
              </div>
            )}
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Upload Dataset</h2>
              <p className="text-sm text-slate-500 mt-1">
                Upload a CSV file or load a sample dataset to get started.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="bg-white rounded-2xl p-8 shadow-sm border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors cursor-pointer text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800">
                  Upload CSV File
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Click to browse and select a .csv file from your device.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onFileInput}
                  className="hidden"
                />
              </div>
              <div
                onClick={handleSample}
                className="bg-white rounded-2xl p-8 shadow-sm border-2 border-dashed border-slate-200 hover:border-purple-400 transition-colors cursor-pointer text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-800">
                  Load Sample Dataset
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Try a built-in student dataset with missing values and
                  duplicates.
                </p>
              </div>
            </div>
            {hasData && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Dataset <strong>{fileName}</strong> is loaded with{" "}
                  <strong>{original.rows.length}</strong> rows. Go to the
                  Dashboard to see quality stats or to Clean Dataset to begin.
                </p>
              </div>
            )}
          </div>
        )}

        {hasData && tab === "quality" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Data Quality Analysis
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Detected issues in your dataset are listed below.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Missing Values"
                value={beforeStats!.missingValues}
                icon={<AlertTriangle className="w-6 h-6" />}
                accent="amber"
              />
              <StatCard
                label="Duplicate Rows"
                value={beforeStats!.duplicateRows}
                icon={<Copy className="w-6 h-6" />}
                accent="purple"
              />
              <StatCard
                label="Empty Cells"
                value={beforeStats!.missingValues}
                icon={<Info className="w-6 h-6" />}
                accent="blue"
              />
              <StatCard
                label="Rows with Issues"
                value={problems.length}
                icon={<AlertTriangle className="w-6 h-6" />}
                accent="amber"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">
                  Problematic Rows ({problems.length})
                </h3>
              </div>
              {problems.length === 0 ? (
                <div className="text-center text-slate-400 py-12 text-sm">
                  No problems detected. Your dataset is clean!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">
                          Row #
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                          Issue Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.map((p) => (
                        <tr
                          key={p.rowIndex}
                          className="border-b border-slate-100"
                        >
                          <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                            Row {p.rowIndex + 1}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1.5">
                              {p.reasons.map((r, i) => (
                                <span
                                  key={i}
                                  className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-100"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-3">
                Column Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                        Column
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                        Type
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                        Missing
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                        Mean
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {original.headers.map((h, c) => (
                      <tr key={c} className="border-b border-slate-100">
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {h}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {meta[c].isNumeric ? "Numeric" : "Text"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {meta[c].missingCount}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {meta[c].mean !== null
                            ? Math.round(meta[c].mean! * 100) / 100
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {hasData && tab === "clean" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Clean Dataset
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Apply individual cleaning operations or run all at once.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <CleanButton
                title="Remove Duplicate Rows"
                desc="Delete exact duplicate entries."
                icon={<Copy className="w-5 h-5" />}
                onClick={handleRemoveDuplicates}
              />
              <CleanButton
                title="Fill Missing Numeric Values"
                desc="Replace blanks with column average."
                icon={<Hash className="w-5 h-5" />}
                onClick={handleFillNumeric}
              />
              <CleanButton
                title="Fill Missing Text Values"
                desc="Replace blanks with Unknown."
                icon={<Info className="w-5 h-5" />}
                onClick={handleFillText}
              />
              <CleanButton
                title="Remove Empty Rows"
                desc="Delete completely blank rows."
                icon={<Trash2 className="w-5 h-5" />}
                onClick={handleRemoveEmpty}
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <button
                  onClick={handleCleanAll}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-sm hover:shadow-md transition-shadow"
                >
                  <Sparkles className="w-5 h-5" />
                  Clean Dataset (Run All Operations)
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-3">
                Current Dataset Preview
              </h3>
              <DataTable
                dataset={original}
                highlightMissing
                emptyMessage="No data loaded."
              />
            </div>

            {insights.length > 0 && <InsightList insights={insights} />}
          </div>
        )}

        {tab === "cleaned" && (
          <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Cleaned Data
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {hasCleaned
                    ? "Your cleaned dataset is ready to preview and download."
                    : "No cleaned dataset yet. Go to Clean Dataset to run cleaning."}
                </p>
              </div>
              {hasCleaned && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <FileDown className="w-5 h-5" />
                  Download Cleaned CSV
                </button>
              )}
            </div>

            {hasCleaned && afterStats && beforeStats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <h3 className="font-semibold text-slate-800 mb-4">
                    Before Cleaning
                  </h3>
                  <div className="space-y-3">
                    <CompareRow
                      label="Total Rows"
                      value={beforeStats.totalRows}
                    />
                    <CompareRow
                      label="Missing Values"
                      value={beforeStats.missingValues}
                    />
                    <CompareRow
                      label="Duplicate Rows"
                      value={beforeStats.duplicateRows}
                    />
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <h3 className="font-semibold text-slate-800 mb-4">
                    After Cleaning
                  </h3>
                  <div className="space-y-3">
                    <CompareRow
                      label="Total Rows"
                      value={afterStats.totalRows}
                    />
                    <CompareRow
                      label="Missing Values"
                      value={afterStats.missingValues}
                    />
                    <CompareRow
                      label="Duplicate Rows"
                      value={afterStats.duplicateRows}
                    />
                  </div>
                </div>
              </div>
            )}

            {hasCleaned && afterStats && beforeStats && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-800">
                    Comparison Chart
                  </h3>
                </div>
                <ComparisonChart before={beforeStats} after={afterStats} />
              </div>
            )}

            {hasCleaned && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-3">
                  Cleaned Dataset
                </h3>
                <DataTable dataset={cleaned} />
              </div>
            )}

            {hasCleaned && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-3">
                  Original Dataset
                </h3>
                <DataTable
                  dataset={original}
                  highlightMissing
                />
              </div>
            )}

            {hasCleaned && insights.length > 0 && (
              <InsightList insights={insights} />
            )}

            {!hasCleaned && hasData && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Head to the{" "}
                  <button
                    onClick={() => setTab("clean")}
                    className="font-semibold underline"
                  >
                    Clean Dataset
                  </button>{" "}
                  tab to run cleaning operations.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center">
          <p className="text-sm text-slate-500">
            AI &amp; Machine Learning – Dataset Cleaning
          </p>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({
  onUpload,
  onSample,
}: {
  onUpload: () => void;
  onSample: () => void;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800">
        Welcome to Student Dataset Cleaner
      </h2>
      <p className="text-slate-500 mt-2 max-w-md mx-auto">
        Upload a CSV dataset to detect quality issues, clean the data, and
        download the results. Perfect for AI &amp; Machine Learning coursework.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-5 h-5" />
          Upload CSV
        </button>
        <button
          onClick={onSample}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Load Sample Dataset
        </button>
      </div>
    </div>
  );
}

function CleanButton({
  title,
  desc,
  icon,
  onClick,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
    </button>
  );
}

function CompareRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-lg font-bold text-slate-800">{value}</span>
    </div>
  );
}

function InsightList({ insights }: { insights: DataInsight[] }) {
  const iconMap = {
    info: <Info className="w-4 h-4 text-blue-600" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  };
  const bgMap = {
    info: "bg-blue-50 border-blue-100",
    success: "bg-emerald-50 border-emerald-100",
    warning: "bg-amber-50 border-amber-100",
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <h3 className="font-semibold text-slate-800 mb-3">Data Insights</h3>
      <div className="space-y-2">
        {insights.slice(-8).map((ins, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${bgMap[ins.type]}`}
          >
            {iconMap[ins.type]}
            <span className="text-sm text-slate-700">{ins.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
