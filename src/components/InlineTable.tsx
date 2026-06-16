import React, { useState, useMemo } from "react";
import { Download, Filter, ChevronDown } from "lucide-react";
import type { AdvancedPivotResult } from "../lib/advancedPivotCalculator";
import type { PercentageType } from "../lib/posthocAnalysis";
import { calculatePercentageByType, getSignificanceCells } from "../lib/posthocAnalysis";

interface InlineTableProps {
  result: AdvancedPivotResult | null;
  excludedCategories: Record<string, string[]>;
  onExcludedCategoriesChange: (excluded: Record<string, string[]>) => void;
  groupings: Record<string, Record<string, string[]>>;
  onGroupingsChange: (groupings: Record<string, Record<string, string[]>>) => void;
  percentageType: PercentageType;
  onPercentageTypeChange: (type: PercentageType) => void;
  displayFormat: "count" | "percentage" | "both";
  calculateStats: boolean;
  decimalPlaces: number;
}

export function InlineTable({
  result,
  excludedCategories,
  onExcludedCategoriesChange,
  groupings,
  onGroupingsChange,
  percentageType,
  onPercentageTypeChange,
  displayFormat,
  calculateStats,
  decimalPlaces,
}: InlineTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [expandedCols, setExpandedCols] = useState<Set<number>>(new Set());
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [groupingField, setGroupingField] = useState<string>("");

  if (!result || result.rows.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600">Configure rows, columns, and values to see results</p>
      </div>
    );
  }

  // Get unique field names from labels
  const rowFields =
    result.rowLabels.length > 0 ? result.rowLabels[0].length : 0;
  const colFields =
    result.columnLabels.length > 0 ? result.columnLabels[0].length : 0;

  // Get significance cells
  const significanceCells = useMemo(() => {
    if (
      !calculateStats ||
      rowFields === 0 ||
      colFields === 0 ||
      !result.columnTotals ||
      !result.rowTotals
    ) {
      return [];
    }
    return getSignificanceCells(
      result.rows as number[][],
      result.rowTotals,
      result.columnTotals,
      result.columnTotals.reduce((a, b) => a + b, 0)
    );
  }, [result, calculateStats, rowFields, colFields]);

  const exportToCSV = () => {
    let csv = "";

    // Header row with fields info
    csv += "," + result.headers.join(",") + ",Total\n";

    // Data rows
    for (let i = 0; i < result.rows.length; i++) {
      const rowLabel = result.rowLabels[i].join(" > ");
      csv += `"${rowLabel}"`;

      for (let j = 0; j < result.rows[i].length; j++) {
        const value = result.rows[i][j];
        const colTotal = result.columnTotals?.[j] || value;
        const grandTotal = result.columnTotals?.reduce((a, b) => a + b, 0) || 0;
        const rowTotal = result.rowTotals?.[i] || 0;

        let cellValue = value.toString();

        if (displayFormat === "percentage") {
          cellValue = calculatePercentageByType(
            value,
            rowTotal,
            colTotal,
            grandTotal,
            percentageType
          );
        } else if (displayFormat === "both") {
          const pct = calculatePercentageByType(
            value,
            rowTotal,
            colTotal,
            grandTotal,
            percentageType
          );
          cellValue = `${value} (${pct})`;
        }

        // Add notation if significant
        const notation = significanceCells
          .filter((c) => c.row === i && c.col === j)
          .map((c) => c.notation)
          .join("");
        cellValue += notation;

        csv += "," + cellValue;
      }

      const total = result.rowTotals?.[i] || 0;
      csv += "," + total + "\n";
    }

    // Total row
    if (result.columnTotals) {
      csv += "Total";
      for (const total of result.columnTotals) {
        csv += "," + total;
      }
      const grandTotal = result.columnTotals.reduce((a, b) => a + b, 0);
      csv += "," + grandTotal + "\n";
    }

    // Add significance notes
    if (significanceCells.length > 0) {
      csv += "\nSignificance Levels:\n";
      csv += '"* p<0.05, ** p<0.01, *** p<0.001"\n';
    }

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "pivot_table.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCellValue = (value: number, rowIdx: number, colIdx: number) => {
    const rowTotal = result.rowTotals?.[rowIdx] || value;
    const colTotal = result.columnTotals?.[colIdx] || value;
    const grandTotal = result.columnTotals?.reduce((a, b) => a + b, 0) || 0;

    let formatted = value.toString();

    if (displayFormat === "percentage") {
      formatted = calculatePercentageByType(
        value,
        rowTotal,
        colTotal,
        grandTotal,
        percentageType
      );
    } else if (displayFormat === "both") {
      const pct = calculatePercentageByType(
        value,
        rowTotal,
        colTotal,
        grandTotal,
        percentageType
      );
      formatted = `${value}\n(${pct})`;
    }

    // Add significance notation
    const notation = significanceCells
      .filter((c) => c.row === rowIdx && c.col === colIdx)
      .map((c) => c.notation)
      .join("");

    if (notation) {
      formatted += `\n${notation}`;
    }

    return formatted;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header with controls */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">
              Percentage Calculation
            </label>
            <div className="flex gap-2 mt-1">
              {(["total", "row", "column"] as const).map((type) => (
                <label key={type} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    checked={percentageType === type}
                    onChange={() => onPercentageTypeChange(type)}
                    className="w-3 h-3"
                  />
                  <span className="text-xs text-gray-700 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Significance legend */}
      {significanceCells.length > 0 && (
        <div className="bg-blue-50 px-4 py-2 border-b text-xs text-gray-700">
          <span className="font-semibold">Significance levels:</span>
          <span className="ml-2">* p&lt;0.05</span>
          <span className="ml-2">** p&lt;0.01</span>
          <span className="ml-2">*** p&lt;0.001</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r bg-gray-50 sticky left-0 z-10">
                Category
              </th>
              {result.headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-r"
                >
                  {header}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 bg-blue-100">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {result.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b ${
                  rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-blue-50 transition`}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-800 border-r bg-gray-50 sticky left-0 z-10">
                  {result.rowLabels[rowIdx].join(" > ")}
                </td>

                {row.map((value, colIdx) => {
                  const isSignificant = significanceCells.some(
                    (c) => c.row === rowIdx && c.col === colIdx
                  );
                  return (
                    <td
                      key={colIdx}
                      className={`px-4 py-3 text-sm text-center border-r whitespace-pre-wrap ${
                        isSignificant ? "font-bold bg-yellow-50" : ""
                      }`}
                    >
                      {formatCellValue(value, rowIdx, colIdx)}
                    </td>
                  );
                })}

                <td className="px-4 py-3 text-sm font-semibold text-center text-gray-800 bg-blue-100">
                  {result.rowTotals?.[rowIdx] || 0}
                </td>
              </tr>
            ))}

            {/* Total Row */}
            {result.columnTotals && (
              <tr className="bg-blue-200 border-t-2 border-blue-300 font-semibold">
                <td className="px-4 py-3 text-sm text-gray-800 border-r bg-blue-100 sticky left-0 z-10">
                  Total
                </td>
                {result.columnTotals.map((total, idx) => (
                  <td
                    key={idx}
                    className="px-4 py-3 text-sm text-center text-gray-800 border-r"
                  >
                    {total}
                  </td>
                ))}
                <td className="px-4 py-3 text-sm text-center text-gray-800 bg-blue-300">
                  {result.columnTotals.reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 px-4 py-3 border-t text-xs text-gray-600">
        <p>
          <span className="font-semibold">{result.rows.length}</span> row(s) ×{" "}
          <span className="font-semibold">{result.headers.length}</span> column(s) ={" "}
          <span className="font-semibold">
            {result.columnTotals?.reduce((a, b) => a + b, 0) || 0}
          </span>{" "}
          total observations
        </p>
        {significanceCells.length > 0 && (
          <p className="mt-1">
            {significanceCells.length} cell(s) with significant differences
          </p>
        )}
      </div>
    </div>
  );
}
