import React from "react";
import { Download, Table } from "lucide-react";
import type { AdvancedPivotResult } from "../lib/advancedPivotCalculator";
import { formatValue } from "../lib/advancedPivotCalculator";

interface AdvancedPivotPreviewProps {
  result: AdvancedPivotResult | null;
  loading?: boolean;
}

export function AdvancedPivotPreview({ result, loading = false }: AdvancedPivotPreviewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Calculating pivot table...</p>
        </div>
      </div>
    );
  }

  if (!result || result.rows.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <Table className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600">Configure rows, columns, and values to see results</p>
      </div>
    );
  }

  const exportToCSV = () => {
    let csv = "";

    // Header row
    csv += "," + result.headers.join(",") + ",Total\n";

    // Data rows
    for (let i = 0; i < result.rows.length; i++) {
      const rowLabel = result.rowLabels[i].join(" > ");
      const values = result.rows[i]
        .map((val) => formatValue(val, result.columnTotals?.[result.rows[0].indexOf(val)] || val, result.displayFormat))
        .join(",");
      const total = result.rowTotals?.[i] || 0;
      csv += `"${rowLabel}",${values},${total}\n`;
    }

    // Total row
    if (result.columnTotals) {
      csv += "Total," + result.columnTotals.join(",");
      const grandTotal = result.columnTotals.reduce((a, b) => a + b, 0);
      csv += "," + grandTotal + "\n";
    }

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pivot_table.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
        <div className="flex items-center gap-2">
          <Table className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">Pivot Table Results</h3>
          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {result.displayFormat === "count"
              ? "Count"
              : result.displayFormat === "percentage"
              ? "Percentage"
              : "Count & %"}
          </span>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r bg-gray-50">
                {result.rowLabels.length > 0 ? result.rowLabels[0].join(" / ") : "Category"}
              </th>
              {result.headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-r"
                >
                  {header}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 bg-blue-50">
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
                <td className="px-4 py-3 text-sm font-medium text-gray-800 border-r bg-gray-50 sticky left-0">
                  {result.rowLabels[rowIdx].join(" > ")}
                </td>

                {row.map((value, colIdx) => {
                  const total = result.columnTotals?.[colIdx] || value;
                  const formatted = formatValue(
                    value,
                    total,
                    result.displayFormat
                  );

                  return (
                    <td
                      key={colIdx}
                      className="px-4 py-3 text-sm text-center text-gray-700 border-r"
                    >
                      {formatted}
                    </td>
                  );
                })}

                <td className="px-4 py-3 text-sm font-semibold text-center text-gray-800 bg-blue-50">
                  {result.rowTotals?.[rowIdx] || 0}
                </td>
              </tr>
            ))}

            {/* Total Row */}
            {result.columnTotals && (
              <tr className="bg-blue-100 border-t-2 border-blue-300 font-semibold">
                <td className="px-4 py-3 text-sm text-gray-800 border-r bg-blue-50">
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
                <td className="px-4 py-3 text-sm text-center text-gray-800 bg-blue-200">
                  {result.columnTotals.reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 px-4 py-3 border-t text-xs text-gray-600 space-y-1">
        <p>
          <span className="font-semibold">{result.rows.length}</span> row(s) ×{" "}
          <span className="font-semibold">{result.headers.length}</span> column(s) ={" "}
          <span className="font-semibold">{result.columnTotals?.reduce((a, b) => a + b, 0) || 0}</span> total observations
        </p>
      </div>
    </div>
  );
}
