import React from "react";
import { Table } from "lucide-react";
import type { PivotResult } from "@/lib/pivotCalculator";

interface PivotTablePreviewProps {
  result: PivotResult | null;
  isLoading?: boolean;
}

export function PivotTablePreview({ result, isLoading }: PivotTablePreviewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border border-gray-300 border-t-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Calculating pivot table...</p>
        </div>
      </div>
    );
  }

  if (!result || result.rows.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-dashed border-gray-300">
        <div className="text-center">
          <Table className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No pivot table data</p>
          <p className="text-gray-500 text-sm mt-1">Configure rows, columns, and values to see results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Table className="w-5 h-5" />
          Pivot Table Preview
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              {result.headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                  rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className={`px-4 py-3 border-r border-gray-200 last:border-r-0 whitespace-nowrap ${
                      cellIdx < result.rowLabels.length
                        ? "font-medium text-gray-700 bg-gray-50"
                        : "text-gray-600 text-right"
                    }`}
                  >
                    {typeof cell === "number" ? formatNumber(cell) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        <span>Total rows: {result.rows.length}</span>
        <span className="mx-3">•</span>
        <span>Total columns: {result.headers.length}</span>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}
