import type {
  Dataset,
  Row,
  AnalysisStats,
  ProblemRow,
  ColumnMeta,
} from "./types";

export function isMissing(v: string | number): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return s === "" || s.toLowerCase() === "na" || s.toLowerCase() === "n/a";
}

export function columnMeta(ds: Dataset): ColumnMeta[] {
  return ds.headers.map((_, col) => {
    const values = ds.rows.map((r) => r[col]);
    const numericValues = values
      .filter((v) => !isMissing(v) && !isNaN(Number(v)))
      .map((v) => Number(v));
    const isNumeric =
      numericValues.length > 0 &&
      numericValues.length === values.filter((v) => !isMissing(v)).length;
    const missingCount = values.filter((v) => isMissing(v)).length;
    const mean =
      isNumeric && numericValues.length > 0
        ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
        : null;
    return { isNumeric, missingCount, mean };
  });
}

export function computeStats(ds: Dataset): AnalysisStats {
  const meta = columnMeta(ds);
  let missing = 0;
  for (const row of ds.rows) {
    for (let c = 0; c < ds.headers.length; c++) {
      if (isMissing(row[c])) missing++;
    }
  }
  const dup = duplicateCount(ds);
  let clean = 0;
  for (let i = 0; i < ds.rows.length; i++) {
    if (!isDuplicateRow(ds.rows, i) && rowMissingCount(ds.rows[i]) === 0) {
      clean++;
    }
  }
  return {
    totalRows: ds.rows.length,
    missingValues: missing,
    duplicateRows: dup,
    cleanRows: clean,
  };
}

export function rowMissingCount(row: Row): number {
  return row.filter((v) => isMissing(v)).length;
}

export function rowKey(row: Row): string {
  return row.map((v) => String(v).trim()).join("\u0001");
}

export function isDuplicateRow(rows: Row[], index: number): boolean {
  const key = rowKey(rows[index]);
  for (let i = 0; i < rows.length; i++) {
    if (i === index) continue;
    if (rowKey(rows[i]) === key) return i < index;
  }
  return false;
}

export function duplicateCount(ds: Dataset): number {
  let count = 0;
  for (let i = 0; i < ds.rows.length; i++) {
    if (isDuplicateRow(ds.rows, i)) count++;
  }
  return count;
}

export function isEmptyRow(row: Row): boolean {
  return row.every((v) => isMissing(v));
}

export function findProblems(ds: Dataset): ProblemRow[] {
  const meta = columnMeta(ds);
  const problems: ProblemRow[] = [];

  for (let i = 0; i < ds.rows.length; i++) {
    const row = ds.rows[i];
    const reasons: string[] = [];

    if (isDuplicateRow(ds.rows, i)) {
      reasons.push("Duplicate row");
    }
    if (isEmptyRow(row)) {
      reasons.push("Completely empty row");
    }

    for (let c = 0; c < ds.headers.length; c++) {
      const val = row[c];
      if (isMissing(val)) {
        reasons.push(`Missing value in "${ds.headers[c]}"`);
      } else if (meta[c].isNumeric && isNaN(Number(val))) {
        reasons.push(`Invalid numeric value in "${ds.headers[c]}"`);
      }
    }

    if (reasons.length > 0) {
      problems.push({ rowIndex: i, reasons });
    }
  }

  return problems;
}
