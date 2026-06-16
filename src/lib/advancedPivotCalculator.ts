/**
 * Advanced Pivot Calculator — pondération + regroupements avec appartenance
 */

import type { PivotConfig, PivotResult } from "./pivotCalculator";
import { normalizeCellValue } from "./posthocAnalysis";

export type DisplayFormat = "count" | "percentage" | "both";
export type AggregationType = "sum" | "count" | "avg" | "min" | "max";

export interface AdvancedPivotConfig extends PivotConfig {
  displayFormat: DisplayFormat;
  excludedCategories: Record<string, string[]>;
  groupings: Record<string, Record<string, string[]>>;
  calculateStats: boolean;
  decimalPlaces: number;
  weightField?: string;   // champ de pondération (optionnel)
}

export interface AdvancedPivotResult extends PivotResult {
  displayFormat: DisplayFormat;
  rowLabels: string[][];
  columnLabels: string[][];
  rowTotals?: number[];
  columnTotals?: number[];
  rawRows?: number[][];       // effectifs bruts (si pondération active)
  rawRowTotals?: number[];
  rawColumnTotals?: number[];
  isGroupRow?: boolean[];
  isGroupCol?: boolean[];
  /** Pour chaque ligne, indice de la ligne-groupe parente (-1 si aucune) */
  groupMemberOf?: number[];
}

const GROUP_PREFIX = "__GRP__";

function formatKey(key: string): string {
  if (key.startsWith(GROUP_PREFIX)) return key.slice(GROUP_PREFIX.length);
  return key.split("||").join(" › ");
}

function buildPivotMaps(data: Record<string, any>[], config: AdvancedPivotConfig) {
  const rowMap = new Map<string, Map<string, any[]>>();
  const allRowKeys = new Set<string>();
  const allColKeys = new Set<string>();

  for (const row of data) {
    if (config.rows.some((f) => config.excludedCategories[f]?.includes(normalizeCellValue(row[f])))) continue;
    if (config.columns.some((f) => config.excludedCategories[f]?.includes(normalizeCellValue(row[f])))) continue;

    const rowKey = config.rows.map((f) => normalizeCellValue(row[f])).join("||");
    const colKey = config.columns.map((f) => normalizeCellValue(row[f])).join("||");

    allRowKeys.add(rowKey);
    allColKeys.add(colKey);

    if (!rowMap.has(rowKey)) rowMap.set(rowKey, new Map());
    if (!rowMap.get(rowKey)!.has(colKey)) rowMap.get(rowKey)!.set(colKey, []);
    rowMap.get(rowKey)!.get(colKey)!.push(row);
  }
  return { rowMap, allRowKeys, allColKeys };
}

function aggregateCell(
  data: Record<string, any>[],
  values: Array<{ field: string; aggregation: AggregationType }>,
  decimals: number,
  weightField?: string
): { weighted: number; raw: number } {
  const raw = data.length;

  if (values.length === 0) {
    if (weightField) {
      const w = data.reduce((s, d) => s + (parseFloat(d[weightField]) || 0), 0);
      return { weighted: Math.round(w * Math.pow(10, decimals)) / Math.pow(10, decimals), raw };
    }
    return { weighted: raw, raw };
  }

  const value = values[0];

  if (value.aggregation === "count" && weightField) {
    const w = data.reduce((s, d) => s + (parseFloat(d[weightField]) || 0), 0);
    return { weighted: Math.round(w * Math.pow(10, decimals)) / Math.pow(10, decimals), raw };
  }

  const fieldValues = data.map((d) => parseFloat(d[value.field])).filter((v) => !isNaN(v));
  if (fieldValues.length === 0) return { weighted: 0, raw };

  let result = 0;
  switch (value.aggregation) {
    case "sum": result = fieldValues.reduce((a, b) => a + b, 0); break;
    case "count": result = fieldValues.length; break;
    case "avg": result = fieldValues.reduce((a, b) => a + b, 0) / fieldValues.length; break;
    case "min": result = Math.min(...fieldValues); break;
    case "max": result = Math.max(...fieldValues); break;
  }
  return {
    weighted: Math.round(result * Math.pow(10, decimals)) / Math.pow(10, decimals),
    raw,
  };
}

function sumMatrix(rows: number[][], indices: number[], nCols: number): number[] {
  const summed = new Array(nCols).fill(0);
  for (const idx of indices) {
    for (let c = 0; c < nCols; c++) summed[c] += rows[idx]?.[c] ?? 0;
  }
  return summed;
}

function injectGroupTotals(
  rows: number[][],
  rawRows: number[][],
  headers: string[],
  rowLabels: string[][],
  columnLabels: string[][],
  config: AdvancedPivotConfig
): {
  rows: number[][];
  rawRows: number[][];
  headers: string[];
  rowLabels: string[][];
  columnLabels: string[][];
  isGroupRow: boolean[];
  isGroupCol: boolean[];
  groupMemberOf: number[];
} {
  let curRows = rows;
  let curRawRows = rawRows;
  let curHeaders = headers;
  let curRowLabels = rowLabels;
  let curColLabels = columnLabels;
  const isGroupRow = new Array(rows.length).fill(false);
  const isGroupCol = new Array(headers.length).fill(false);
  const groupMemberOf = new Array(rows.length).fill(-1);

  // --- Colonnes ---
  for (let fieldIdx = 0; fieldIdx < config.columns.length; fieldIdx++) {
    const field = config.columns[fieldIdx];
    const fieldGroups = config.groupings[field];
    if (!fieldGroups) continue;

    const insertions: { index: number; key: string; label: string; colIndices: number[] }[] = [];
    for (const [groupName, values] of Object.entries(fieldGroups)) {
      if (values.length === 0) continue;
      const norm = values.map(normalizeCellValue);
      const matching = curHeaders
        .map((k, i) => ({ k, i }))
        .filter(({ k }) => norm.includes(k.split("||")[fieldIdx] ?? ""))
        .map(({ i }) => i);
      if (matching.length === 0) continue;
      insertions.push({ index: Math.min(...matching), key: `${GROUP_PREFIX}${groupName}`, label: groupName, colIndices: matching });
    }
    insertions.sort((a, b) => a.index - b.index);

    let offset = 0;
    const newHeaders = [...curHeaders];
    const newColLabels = [...curColLabels];
    const newIsGroupCol = [...isGroupCol];

    for (const ins of insertions) {
      const at = ins.index + offset;
      newHeaders.splice(at, 0, ins.key);
      newColLabels.splice(at, 0, [ins.label]);
      newIsGroupCol.splice(at, 0, true);
      curRows = curRows.map((row) => {
        const v = ins.colIndices.reduce((s, ci) => s + (row[ci] ?? 0), 0);
        const r = [...row]; r.splice(at, 0, v); return r;
      });
      curRawRows = curRawRows.map((row) => {
        const v = ins.colIndices.reduce((s, ci) => s + (row[ci] ?? 0), 0);
        const r = [...row]; r.splice(at, 0, v); return r;
      });
      offset++;
    }
    curHeaders = newHeaders;
    curColLabels = newColLabels;
    isGroupCol.length = 0; isGroupCol.push(...newIsGroupCol);
  }

  // --- Lignes ---
  for (let fieldIdx = 0; fieldIdx < config.rows.length; fieldIdx++) {
    const field = config.rows[fieldIdx];
    const fieldGroups = config.groupings[field];
    if (!fieldGroups) continue;

    // Map groupName → matching row indices (dans la liste courante)
    const insertions: { index: number; label: string; rowIndices: number[] }[] = [];
    for (const [groupName, values] of Object.entries(fieldGroups)) {
      if (values.length === 0) continue;
      const norm = values.map(normalizeCellValue);
      const matching: number[] = [];
      curRowLabels.forEach((parts, idx) => {
        if (isGroupRow[idx]) return;
        if (norm.includes(parts[fieldIdx] ?? "")) matching.push(idx);
      });
      if (matching.length === 0) continue;
      insertions.push({ index: Math.min(...matching), label: groupName, rowIndices: matching });
    }
    insertions.sort((a, b) => a.index - b.index);

    const newRows: number[][] = [];
    const newRaw: number[][] = [];
    const newLabels: string[][] = [];
    const newIsGroup: boolean[] = [];
    const newMemberOf: number[] = [];
    let insertedGroupCount = 0; // offset das den neuen Arrays

    for (let i = 0; i < curRows.length; i++) {
      // Injection des groupes avant la ligne i
      for (const ins of insertions.filter((ins) => ins.index === i)) {
        const groupNewIdx = newRows.length;
        newRows.push(sumMatrix(curRows, ins.rowIndices, curHeaders.length));
        newRaw.push(sumMatrix(curRawRows, ins.rowIndices, curHeaders.length));
        newLabels.push([ins.label]);
        newIsGroup.push(true);
        newMemberOf.push(-1);
        // Marquer les membres avec l'index de cette ligne-groupe
        ins.rowIndices.forEach((origIdx) => {
          // On va mettre à jour après dans le tableau newMemberOf
          // On stocke temporairement dans isGroupRow
          (ins as any)._newGroupIdx = groupNewIdx;
        });
        insertedGroupCount++;
      }
      // La ligne elle-même
      const myNewIdx = newRows.length;
      newRows.push(curRows[i]);
      newRaw.push(curRawRows[i]);
      newLabels.push(curRowLabels[i]);
      newIsGroup.push(isGroupRow[i] ?? false);
      newMemberOf.push(groupMemberOf[i] ?? -1);
    }

    // Deuxième passe : mettre à jour groupMemberOf pour les membres
    for (const ins of insertions) {
      const groupNewIdx = (ins as any)._newGroupIdx as number | undefined;
      if (groupNewIdx === undefined) continue;
      // Retrouver les nouvelles positions des membres
      for (let ni = 0; ni < newLabels.length; ni++) {
        if (newIsGroup[ni]) continue;
        // Vérifier si cette ligne était dans ins.rowIndices (avant insertion)
        // On compare par le label
        const origLabel = curRowLabels[ins.rowIndices[0]]?.[fieldIdx] ?? "";
        const valuesNorm = insertions
          .filter((x) => (x as any)._newGroupIdx === groupNewIdx)
          .flatMap((x) => x.rowIndices.map((ri) => curRowLabels[ri]?.[fieldIdx] ?? ""));
        if (valuesNorm.includes(newLabels[ni]?.[fieldIdx] ?? "")) {
          newMemberOf[ni] = groupNewIdx;
        }
      }
    }

    curRows = newRows;
    curRawRows = newRaw;
    curRowLabels = newLabels;
    isGroupRow.length = 0; isGroupRow.push(...newIsGroup);
    groupMemberOf.length = 0; groupMemberOf.push(...newMemberOf);
  }

  return { rows: curRows, rawRows: curRawRows, headers: curHeaders, rowLabels: curRowLabels, columnLabels: curColLabels, isGroupRow, isGroupCol, groupMemberOf };
}

export function calculateAdvancedPivot(
  data: Record<string, any>[],
  config: AdvancedPivotConfig
): AdvancedPivotResult {
  const filteredData = data.filter((row) => {
    for (const [field, excl] of Object.entries(config.excludedCategories)) {
      if (excl.includes(normalizeCellValue(row[field]))) return false;
    }
    return true;
  });

  const { rowMap, allRowKeys, allColKeys } = buildPivotMaps(filteredData, config);
  const sortedRowKeys = Array.from(allRowKeys).sort();
  const sortedColKeys = Array.from(allColKeys).sort();

  const resultWeighted: number[][] = [];
  const resultRaw: number[][] = [];
  const rowLabels = sortedRowKeys.map((k) => k.split("||"));
  const columnLabels = sortedColKeys.map((k) => k.split("||"));

  for (const rowKey of sortedRowKeys) {
    const wRow: number[] = [];
    const rRow: number[] = [];
    for (const colKey of sortedColKeys) {
      const cellData = rowMap.get(rowKey)?.get(colKey) || [];
      const { weighted, raw } = aggregateCell(cellData, config.values, config.decimalPlaces, config.weightField);
      wRow.push(weighted);
      rRow.push(raw);
    }
    resultWeighted.push(wRow);
    resultRaw.push(rRow);
  }

  const withGroups = injectGroupTotals(resultWeighted, resultRaw, sortedColKeys, rowLabels, columnLabels, config);

  // Exclude group columns from row totals (they are sub-sums of other cols → double-count)
  const rowTotals = withGroups.rows.map((r) =>
    r.reduce((s, v, ci) => (withGroups.isGroupCol[ci] ? s : s + v), 0)
  );
  // Exclude group rows from column totals (they are sub-sums of other rows → double-count)
  const colTotals = new Array(withGroups.headers.length).fill(0);
  withGroups.rows.forEach((r, ri) => {
    if (!withGroups.isGroupRow[ri]) r.forEach((v, ci) => { colTotals[ci] += v; });
  });

  const rawRowTotals = withGroups.rawRows.map((r) =>
    r.reduce((s, v, ci) => (withGroups.isGroupCol[ci] ? s : s + v), 0)
  );
  const rawColTotals = new Array(withGroups.headers.length).fill(0);
  withGroups.rawRows.forEach((r, ri) => {
    if (!withGroups.isGroupRow[ri]) r.forEach((v, ci) => { rawColTotals[ci] += v; });
  });

  return {
    headers: withGroups.headers.map(formatKey),
    rows: withGroups.rows,
    rawRows: withGroups.rawRows,
    rowLabels: withGroups.rowLabels,
    columnLabels: withGroups.columnLabels,
    displayFormat: config.displayFormat,
    rowTotals,
    columnTotals: colTotals,
    rawRowTotals,
    rawColumnTotals: rawColTotals,
    isGroupRow: withGroups.isGroupRow,
    isGroupCol: withGroups.isGroupCol,
    groupMemberOf: withGroups.groupMemberOf,
  };
}

export function formatValue(count: number, total: number, format: DisplayFormat, decimals = 1): string {
  if (format === "count") return count.toString();
  if (format === "percentage") return total > 0 ? ((count / total) * 100).toFixed(decimals) + "%" : "0%";
  if (total === 0) return "0 (0%)";
  return `${count} (${((count / total) * 100).toFixed(decimals)}%)`;
}

export function generateSummaryStats(): string { return ""; }
