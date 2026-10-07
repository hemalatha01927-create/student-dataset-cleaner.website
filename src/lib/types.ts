export type Row = (string | number)[];

export interface Dataset {
  headers: string[];
  rows: Row[];
}

export interface AnalysisStats {
  totalRows: number;
  missingValues: number;
  duplicateRows: number;
  cleanRows: number;
}

export interface ProblemRow {
  rowIndex: number;
  reasons: string[];
}

export interface ColumnMeta {
  isNumeric: boolean;
  missingCount: number;
  mean: number | null;
}

export interface DataInsight {
  message: string;
  type: "info" | "success" | "warning";
}
