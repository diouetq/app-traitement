import React, { useMemo, useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Download, GripVertical, FileSpreadsheet, Info, X } from "lucide-react";
import type { AdvancedPivotResult } from "../lib/advancedPivotCalculator";
import type { PercentageType } from "../lib/posthocAnalysis";
import {
  calculatePercentageByType,
  computeCellNotations,
  getCellNotation,
  getColumnLabels,
  STATS_HELP,
} from "../lib/posthocAnalysis";
import { FieldFilterGroupMenu } from "./FieldFilterGroupMenu";
import type { PivotConfig } from "../lib/pivotCalculator";
import { exportToCSV, exportToExcel, exportToImage } from "../lib/tableExport";

interface StreamlinedTableProps {
  result: AdvancedPivotResult | null;
  data: Record<string, any>[];
  pivotConfig: PivotConfig;
  excludedCategories: Record<string, string[]>;
  onExcludedCategoriesChange: (excluded: Record<string, string[]>) => void;
  groupings: Record<string, Record<string, string[]>>;
  onGroupingsChange: (groupings: Record<string, Record<string, string[]>>) => void;
  percentageType: PercentageType;
  onPercentageTypeChange: (type: PercentageType) => void;
  displayFormat: "count" | "percentage" | "both";
  calculateStats: boolean;
  alpha: number;
  decimalPlaces: number;
  showRaw?: boolean;
}

const GROUP_PALETTE = [
  { border: "#2563eb", light: "#dbeafe", text: "#1e40af" }, // bleu
  { border: "#7c3aed", light: "#ede9fe", text: "#5b21b6" }, // violet
  { border: "#c2410c", light: "#ffedd5", text: "#9a3412" }, // orange
  { border: "#0369a1", light: "#e0f2fe", text: "#0c4a6e" }, // sky
  { border: "#b45309", light: "#fef3c7", text: "#78350f" }, // amber
  { border: "#db2777", light: "#fce7f3", text: "#9d174d" }, // rose
];

function fingerprint(r: AdvancedPivotResult) {
  return r.headers.join("|") + "::" + r.rowLabels.map((l) => l.join(",")).join("|");
}

export function StreamlinedTable({
  result,
  data,
  pivotConfig,
  excludedCategories,
  onExcludedCategoriesChange,
  groupings,
  onGroupingsChange,
  percentageType,
  onPercentageTypeChange,
  displayFormat,
  calculateStats,
  alpha,
  decimalPlaces,
  showRaw = false,
}: StreamlinedTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tableElRef = useRef<HTMLTableElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const [rowOrder, setRowOrder] = useState<number[]>([]);
  const [colOrder, setColOrder] = useState<number[]>([]);
  // null = auto (table-layout: auto), filled = manual widths
  const [colWidths, setColWidths] = useState<Record<number, number> | null>(null);
  const [rowLabelWidth, setRowLabelWidth] = useState<number | null>(null);
  const [totalColWidth, setTotalColWidth] = useState<number | null>(null);
  const [resizing, setResizing] = useState<{ type: "rowLabel" | "col" | "totalCol"; index: number } | null>(null);
  const [dragRow, setDragRow] = useState<number | null>(null);
  const [dragCol, setDragCol] = useState<number | null>(null);
  const [showStatsHelp, setShowStatsHelp] = useState(false);

  const statsEnabled = calculateStats && percentageType !== "total";

  // Reset layout when data changes
  useEffect(() => {
    if (!result) return;
    setRowOrder(result.rows.map((_, i) => i));
    setColOrder(result.headers.map((_, i) => i));
    setColWidths(null);
    setRowLabelWidth(null);
    setTotalColWidth(null);
  }, [result ? fingerprint(result) : null]);

  const orderedRows = rowOrder.length === (result?.rows.length ?? 0) ? rowOrder : result?.rows.map((_, i) => i) ?? [];
  const orderedCols = colOrder.length === (result?.headers.length ?? 0) ? colOrder : result?.headers.map((_, i) => i) ?? [];

  // Column labels (only non-group cols get a letter)
  const colLetters = useMemo(() => {
    if (!result) return {} as Record<number, string>;
    const map: Record<number, string> = {};
    const letters = getColumnLabels(result.headers.length);
    let li = 0;
    result.headers.forEach((_, ci) => {
      if (!result.isGroupCol?.[ci]) map[ci] = letters[li++];
    });
    return map;
  }, [result]);

  // Group color map: rowIdx → palette entry
  const groupColors = useMemo(() => {
    const map: Record<number, typeof GROUP_PALETTE[0]> = {};
    let idx = 0;
    result?.isGroupRow?.forEach((isGroup, rowIdx) => {
      if (isGroup) { map[rowIdx] = GROUP_PALETTE[idx % GROUP_PALETTE.length]; idx++; }
    });
    return map;
  }, [result]);

  // Statistical notations — computed on non-group rows/cols only
  const notations = useMemo(() => {
    if (!statsEnabled || !result?.columnTotals || !result?.rowTotals) return [];
    const nonGrpRowIdx = orderedRows.filter((ri) => !result.isGroupRow?.[ri]);
    const nonGrpColIdx = orderedCols.filter((ci) => !result.isGroupCol?.[ci]);
    const subMatrix = nonGrpRowIdx.map((ri) => nonGrpColIdx.map((ci) => result.rows[ri][ci] as number));
    const subRowTotals = nonGrpRowIdx.map((ri) => result.rowTotals![ri]);
    const subColTotals = nonGrpColIdx.map((ci) => result.columnTotals![ci]);
    const base = percentageType === "row" ? "row" : "column";
    const raw = computeCellNotations(
      subMatrix, subRowTotals, subColTotals,
      subColTotals.reduce((a, b) => a + b, 0),
      base, alpha
    );
    // Remap sub-indices back to original
    return raw.map((n) => ({ ...n, row: nonGrpRowIdx[n.row], col: nonGrpColIdx[n.col] }));
  }, [result, statsEnabled, percentageType, alpha, orderedRows.join(","), orderedCols.join(",")]);

  // Grand total: non-group cols only (avoids double-count from group cols)
  const grandTotal = useMemo(() => {
    if (!result?.columnTotals) return 0;
    return result.columnTotals.filter((_, ci) => !result.isGroupCol?.[ci]).reduce((a, b) => a + b, 0);
  }, [result]);

  // Capture real column widths from DOM and switch to fixed layout
  const captureAndSwitchToFixed = useCallback(() => {
    if (!tableElRef.current) return;
    const ths = Array.from(tableElRef.current.querySelectorAll<HTMLElement>("thead tr th"));
    if (ths.length < 2) return;
    const newColWidths: Record<number, number> = {};
    // th[0] = row label, th[1..n] = data cols (in orderedCols order), last = total
    orderedCols.forEach((ci, dispIdx) => {
      const th = ths[dispIdx + 1];
      if (th) newColWidths[ci] = th.getBoundingClientRect().width;
    });
    setRowLabelWidth(ths[0].getBoundingClientRect().width);
    setTotalColWidth(ths[ths.length - 1].getBoundingClientRect().width);
    setColWidths(newColWidths);
  }, [orderedCols]);

  // Resize handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizing || !resizeRef.current) return;
    const delta = e.clientX - resizeRef.current.startX;
    const newW = Math.max(55, Math.min(600, resizeRef.current.startWidth + delta));
    if (resizing.type === "rowLabel") setRowLabelWidth(newW);
    else if (resizing.type === "totalCol") setTotalColWidth(newW);
    else setColWidths((prev) => ({ ...(prev ?? {}), [resizing.index]: newW }));
  }, [resizing]);

  const handleMouseUp = useCallback(() => {
    setResizing(null);
    resizeRef.current = null;
  }, []);

  useEffect(() => {
    if (resizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [resizing, handleMouseMove, handleMouseUp]);

  const startResize = (
    type: "rowLabel" | "col" | "totalCol",
    index: number,
    currentWidth: number,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (colWidths === null) captureAndSwitchToFixed();
    resizeRef.current = { startX: e.clientX, startWidth: currentWidth };
    setResizing({ type, index });
  };

  const getCurrentColW = (colIdx: number) => colWidths?.[colIdx] ?? 110;
  const getCurrentRlW = () => rowLabelWidth ?? 190;
  const getCurrentTotalW = () => totalColWidth ?? 90;

  const tableWidth = colWidths !== null
    ? getCurrentRlW() + orderedCols.reduce((s, ci) => s + getCurrentColW(ci), 0) + getCurrentTotalW()
    : undefined;

  const reorder = (order: number[], from: number, to: number) => {
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const fmtNum = (v: number) => Number(v.toFixed(decimalPlaces)).toString();

  const formatCell = (value: number, rowTotal: number, colTotal: number): string => {
    if (displayFormat === "percentage")
      return calculatePercentageByType(value, rowTotal, colTotal, grandTotal, percentageType, decimalPlaces);
    if (displayFormat === "both") {
      const pct = calculatePercentageByType(value, rowTotal, colTotal, grandTotal, percentageType, decimalPlaces);
      return `${fmtNum(value)} (${pct})`;
    }
    return fmtNum(value);
  };

  if (!result || result.rows.length === 0) {
    const missing: string[] = [];
    if (pivotConfig.rows.length === 0) missing.push("Lignes");
    if (pivotConfig.columns.length === 0) missing.push("Colonnes");
    if (pivotConfig.values.length === 0) missing.push("Valeurs");
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-200">
        <p className="text-gray-500 text-lg mb-2">Tableau en attente de configuration</p>
        {missing.length > 0 && (
          <p className="text-sm text-orange-600">Il manque : <strong>{missing.join(", ")}</strong></p>
        )}
      </div>
    );
  }

  const rowFields = pivotConfig.rows;
  const colFields = pivotConfig.columns;
  const exportOpts = { displayFormat, percentageType, notations: statsEnabled ? notations : undefined };
  const statsTitle = `Test Z de proportions, Bonferroni α=${(alpha * 100).toFixed(0)}%`;

  const isManual = colWidths !== null;

  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-50 px-4 py-2 border-b flex-wrap gap-3" data-export-ignore="true">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase mr-1">Base %</span>
            {(["total", "row", "column"] as const).map((id) => (
              <label key={id} className="inline-flex items-center gap-1 mr-2 cursor-pointer text-xs">
                <input type="radio" checked={percentageType === id} onChange={() => onPercentageTypeChange(id)} className="w-3 h-3" />
                {id === "total" ? "Total" : id === "row" ? "Ligne" : "Colonne"}
              </label>
            ))}
          </div>

          {calculateStats && percentageType === "total" && (
            <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
              Tests désactivés sur « % Total » — choisissez Ligne ou Colonne
            </span>
          )}

          {statsEnabled && (
            <button type="button" onClick={() => setShowStatsHelp(!showStatsHelp)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Info className="w-3.5 h-3.5" />{statsTitle}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => exportToCSV(result, exportOpts)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 border">
            <Download className="w-3.5 h-3.5" />CSV
          </button>
          <button type="button" onClick={() => exportToExcel(result, exportOpts)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">
            <FileSpreadsheet className="w-3.5 h-3.5" />Excel
          </button>
          <button type="button" onClick={() => containerRef.current && exportToImage(containerRef.current)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
            📷 Image
          </button>
        </div>
      </div>

      {/* Aide statistique */}
      {statsEnabled && showStatsHelp && (
        <div className="px-4 py-3 bg-slate-50 border-b text-xs text-gray-700" data-export-ignore="true">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="font-semibold mb-1">{statsTitle}</p>
              <p className="text-gray-600 mb-2">{STATS_HELP.description}</p>
              <div className="flex flex-wrap gap-2">
                {orderedCols.filter((ci) => !result.isGroupCol?.[ci]).map((ci) => (
                  <span key={ci} className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono text-[10px]">
                    <strong>{colLetters[ci]}</strong> = {result.headers[ci]}
                  </span>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setShowStatsHelp(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
        </div>
      )}

      {/* Barre filtres / regroupements */}
      {(rowFields.length > 0 || colFields.length > 0) && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex flex-wrap gap-4" data-export-ignore="true">
          {rowFields.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-blue-700 uppercase">Lignes :</span>
              {rowFields.map((field) => (
                <div key={field} className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded border border-blue-200 text-xs">
                  <span className="font-medium">{field}</span>
                  <FieldFilterGroupMenu field={field} data={data}
                    excludedCategories={excludedCategories} onExcludedCategoriesChange={onExcludedCategoriesChange}
                    groupings={groupings} onGroupingsChange={onGroupingsChange} />
                </div>
              ))}
            </div>
          )}
          {colFields.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-green-700 uppercase">Colonnes :</span>
              {colFields.map((field) => (
                <div key={field} className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded border border-green-200 text-xs">
                  <span className="font-medium">{field}</span>
                  <FieldFilterGroupMenu field={field} data={data}
                    excludedCategories={excludedCategories} onExcludedCategoriesChange={onExcludedCategoriesChange}
                    groupings={groupings} onGroupingsChange={onGroupingsChange} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="px-4 py-1 text-[10px] text-gray-400 border-b" data-export-ignore="true">
        ⋮⋮ Glisser en-têtes pour réordonner · Bord droit pour redimensionner
      </p>

      <div className="overflow-x-auto" style={{ userSelect: resizing ? "none" : "auto" }}>
        <table
          ref={tableElRef}
          className="border-collapse text-sm"
          style={isManual
            ? { tableLayout: "fixed", width: tableWidth }
            : { tableLayout: "auto", width: "100%" }
          }
        >
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              {/* Row label header */}
              <th
                className="px-2 py-2 text-left font-bold text-gray-700 border-r sticky left-0 z-20 bg-gray-50 relative"
                style={isManual ? { width: getCurrentRlW() } : { minWidth: 130 }}
              >
                <span className="block text-xs leading-snug break-words">
                  {rowFields.length > 0 ? rowFields.join(" × ") : "Catégorie"}
                </span>
                <div
                  className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-400 z-30"
                  onMouseDown={(e) => startResize("rowLabel", 0, getCurrentRlW(), e)}
                />
              </th>

              {orderedCols.map((ci, dispIdx) => {
                const isGrpCol = result.isGroupCol?.[ci];
                const letter = colLetters[ci];
                const grpColor = isGrpCol
                  ? (() => {
                      let gi = 0;
                      for (let k = 0; k < ci; k++) if (result.isGroupCol?.[k]) gi++;
                      return GROUP_PALETTE[gi % GROUP_PALETTE.length];
                    })()
                  : null;

                return (
                  <th
                    key={ci}
                    draggable
                    onDragStart={() => setDragCol(dispIdx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragCol !== null && dragCol !== dispIdx) setColOrder(reorder(orderedCols, dragCol, dispIdx));
                      setDragCol(null);
                    }}
                    className="px-2 py-2 text-center font-bold text-gray-700 border-r relative select-none"
                    style={{
                      ...(isManual ? { width: getCurrentColW(ci) } : { minWidth: 70 }),
                      borderLeft: grpColor ? `3px solid ${grpColor.border}` : undefined,
                      background: grpColor ? grpColor.light : "#f9fafb",
                    }}
                  >
                    <div className="flex items-start justify-center gap-0.5">
                      <GripVertical className="w-3 h-3 text-gray-300 cursor-grab flex-shrink-0 mt-0.5" />
                      <div className="text-xs leading-snug break-words min-w-0">
                        {result.headers[ci]}
                        {statsEnabled && letter && (
                          <span className="ml-1 text-[10px] font-bold text-blue-500">({letter})</span>
                        )}
                      </div>
                    </div>
                    <div
                      className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-400 z-10"
                      onMouseDown={(e) => startResize("col", ci, getCurrentColW(ci), e)}
                    />
                  </th>
                );
              })}

              {/* Total column header */}
              <th
                className="px-2 py-2 text-center font-semibold text-gray-600 bg-gray-100 relative"
                style={isManual ? { width: getCurrentTotalW() } : { minWidth: 70 }}
              >
                <span className="text-xs">Total</span>
                <div
                  className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-400 z-10"
                  onMouseDown={(e) => startResize("totalCol", 0, getCurrentTotalW(), e)}
                />
              </th>
            </tr>
          </thead>

          <tbody>
            {orderedRows.map((rowIdx, dispRowIdx) => {
              const isGrp = result.isGroupRow?.[rowIdx];
              const parentGrpIdx = result.groupMemberOf?.[rowIdx] ?? -1;
              const hasMember = parentGrpIdx >= 0;
              const rowColor = isGrp
                ? groupColors[rowIdx]
                : hasMember
                  ? groupColors[parentGrpIdx]
                  : null;

              const rT = result.rowTotals?.[rowIdx] ?? 0;

              return (
                <tr
                  key={rowIdx}
                  draggable
                  onDragStart={() => setDragRow(dispRowIdx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragRow !== null && dragRow !== dispRowIdx) setRowOrder(reorder(orderedRows, dragRow, dispRowIdx));
                    setDragRow(null);
                  }}
                  className={`border-b hover:bg-blue-50/20 transition-colors ${
                    dispRowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                  }`}
                >
                  {/* Row label cell */}
                  <td
                    className="px-2 py-1.5 border-r sticky left-0 z-10 bg-inherit"
                    style={{
                      ...(isManual ? { width: getCurrentRlW() } : {}),
                      borderLeft: rowColor
                        ? `${isGrp ? "4px" : "3px"} solid ${rowColor.border}`
                        : "3px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <GripVertical className="w-3 h-3 text-gray-300 cursor-grab flex-shrink-0" />
                      <span
                        className={`text-xs leading-snug break-words ${
                          isGrp ? "font-bold" : hasMember ? "pl-1" : "font-medium"
                        }`}
                        style={{ color: rowColor ? rowColor.text : "#374151" }}
                      >
                        {result.rowLabels[rowIdx].join(" › ")}
                      </span>
                    </div>
                  </td>

                  {/* Data cells */}
                  {orderedCols.map((ci) => {
                    const value = result.rows[rowIdx][ci] as number;
                    const rawValue = result.rawRows?.[rowIdx]?.[ci];
                    const cT = result.columnTotals?.[ci] ?? 0;
                    const n = statsEnabled ? getCellNotation(rowIdx, ci, notations) : undefined;
                    const isGrpCol = result.isGroupCol?.[ci];

                    const hasHigher = (n?.higherThan?.length ?? 0) > 0;
                    const hasLower = (n?.lowerThan?.length ?? 0) > 0;

                    // Subtle background for statistical significance vs global distribution
                    let cellBg = "";
                    if (n?.direction === "higher") cellBg = "bg-green-50";
                    else if (n?.direction === "lower") cellBg = "bg-red-50";

                    const grpColColor = isGrpCol
                      ? (() => {
                          let gi = 0;
                          for (let k = 0; k < ci; k++) if (result.isGroupCol?.[k]) gi++;
                          return GROUP_PALETTE[gi % GROUP_PALETTE.length];
                        })()
                      : null;

                    return (
                      <td
                        key={ci}
                        className={`px-2 py-1.5 text-center border-r ${cellBg}`}
                        style={{
                          ...(isManual ? { width: getCurrentColW(ci) } : {}),
                          borderLeft: grpColColor ? `2px solid ${grpColColor.border}` : undefined,
                          background: grpColColor && !cellBg ? grpColColor.light + "44" : undefined,
                        }}
                      >
                        {/* Main value */}
                        <div className="font-medium text-sm leading-tight">
                          {formatCell(value, rT, cT)}
                        </div>

                        {/* Raw n (pondération) */}
                        {showRaw && rawValue !== undefined && (
                          <div className="text-[10px] text-violet-500 leading-tight mt-0.5">
                            n={rawValue}
                          </div>
                        )}

                        {/* Statistical letters — separated clearly */}
                        {(hasHigher || hasLower) && (
                          <div className="text-[10px] leading-tight mt-1 flex items-center justify-center gap-1.5">
                            {hasHigher && (
                              <span className="text-green-700 font-semibold">+{n!.higherThan.join("")}</span>
                            )}
                            {hasLower && (
                              <span className="text-red-600 font-semibold">-{n!.lowerThan.join("")}</span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Total column — same formatting as data cells, no stats */}
                  <td
                    className="px-2 py-1.5 text-center bg-gray-50 border-l border-gray-200"
                    style={isManual ? { width: getCurrentTotalW() } : {}}
                  >
                    <div className="font-semibold text-sm leading-tight text-gray-700">
                      {formatCell(rT, rT, grandTotal)}
                    </div>
                    {showRaw && result.rawRowTotals?.[rowIdx] !== undefined && (
                      <div className="text-[10px] text-violet-500 leading-tight mt-0.5">
                        n={result.rawRowTotals[rowIdx]}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Total row — same formatting, no stats */}
            {result.columnTotals && (
              <tr className="border-t-2 border-gray-300 bg-gray-100">
                <td
                  className="px-2 py-1.5 border-r font-bold text-gray-700 sticky left-0 z-10 bg-gray-100 text-xs"
                  style={{
                    ...(isManual ? { width: getCurrentRlW() } : {}),
                    borderLeft: "3px solid transparent",
                  }}
                >
                  Total
                </td>
                {orderedCols.map((ci) => {
                  const cT = result.columnTotals![ci];
                  const isGrpCol = result.isGroupCol?.[ci];
                  const grpColColor = isGrpCol
                    ? (() => {
                        let gi = 0;
                        for (let k = 0; k < ci; k++) if (result.isGroupCol?.[k]) gi++;
                        return GROUP_PALETTE[gi % GROUP_PALETTE.length];
                      })()
                    : null;
                  return (
                    <td
                      key={ci}
                      className="px-2 py-1.5 text-center border-r"
                      style={{
                        ...(isManual ? { width: getCurrentColW(ci) } : {}),
                        borderLeft: grpColColor ? `2px solid ${grpColColor.border}` : undefined,
                        background: grpColColor ? grpColColor.light + "66" : undefined,
                      }}
                    >
                      <div className="font-semibold text-sm leading-tight">
                        {formatCell(cT, grandTotal, cT)}
                      </div>
                      {showRaw && result.rawColumnTotals?.[ci] !== undefined && (
                        <div className="text-[10px] text-violet-500 leading-tight mt-0.5">
                          n={result.rawColumnTotals[ci]}
                        </div>
                      )}
                    </td>
                  );
                })}
                {/* Grand total cell */}
                <td
                  className="px-2 py-1.5 text-center bg-gray-200 border-l border-gray-300"
                  style={isManual ? { width: getCurrentTotalW() } : {}}
                >
                  <div className="font-bold text-sm leading-tight text-gray-800">
                    {displayFormat === "percentage"
                      ? "100%"
                      : displayFormat === "both"
                        ? `${fmtNum(grandTotal)} (100%)`
                        : fmtNum(grandTotal)}
                  </div>
                  {showRaw && result.rawColumnTotals && (
                    <div className="text-[10px] text-violet-500 leading-tight mt-0.5">
                      n={result.rawColumnTotals.filter((_, ci) => !result.isGroupCol?.[ci]).reduce((a, b) => a + b, 0)}
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-4 py-1.5 border-t text-xs text-gray-400 flex items-center justify-between">
        <span>
          {orderedRows.filter((ri) => !result.isGroupRow?.[ri]).length} ligne(s) ×{" "}
          {orderedCols.filter((ci) => !result.isGroupCol?.[ci]).length} col.
        </span>
        <span className="font-medium text-gray-500">
          N = {fmtNum(grandTotal)}
        </span>
      </div>
    </div>
  );
}
