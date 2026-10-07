import type { Dataset, Row } from "./types";
import { isMissing, columnMeta, isEmptyRow, rowKey } from "./analysis";

export function removeDuplicates(ds: Dataset): Dataset {
  const seen = new Set<string>();
  const rows: Row[] = [];
  for (const row of ds.rows) {
    const k = rowKey(row);
    if (!seen.has(k)) {
      seen.add(k);
      rows.push(row);
    }
  }
  return { headers: ds.headers, rows };
}

export function fillMissingNumeric(ds: Dataset): Dataset {
  const meta = columnMeta(ds);
  const rows = ds.rows.map((row) =>
    row.map((v, c) => {
      if (meta[c].isNumeric && isMissing(v) && meta[c].mean !== null) {
        return Math.round((meta[c].mean as number) * 100) / 100;
      }
      return v;
    })
  );
  return { headers: ds.headers, rows };
}

export function fillMissingText(ds: Dataset): Dataset {
  const meta = columnMeta(ds);
  const rows = ds.rows.map((row) =>
    row.map((v, c) => {
      if (!meta[c].isNumeric && isMissing(v)) return "Unknown";
      return v;
    })
  );
  return { headers: ds.headers, rows };
}

export function removeEmptyRows(ds: Dataset): Dataset {
  return {
    headers: ds.headers,
    rows: ds.rows.filter((r) => !isEmptyRow(r)),
  };
}

export function cleanDataset(ds: Dataset): Dataset {
  let result = ds;
  result = removeDuplicates(result);
  result = removeEmptyRows(result);
  result = fillMissingNumeric(result);
  result = fillMissingText(result);
  return result;
}
