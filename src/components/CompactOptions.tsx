import React from "react";
import { Settings } from "lucide-react";
import type { DisplayFormat } from "../lib/advancedPivotCalculator";

interface CompactOptionsProps {
  displayFormat: DisplayFormat;
  onDisplayFormatChange: (format: DisplayFormat) => void;
  decimalPlaces: number;
  onDecimalPlacesChange: (places: number) => void;
  calculateStats: boolean;
  onCalculateStatsChange: (calculate: boolean) => void;
}

export function CompactOptions({
  displayFormat,
  onDisplayFormatChange,
  decimalPlaces,
  onDecimalPlacesChange,
  calculateStats,
  onCalculateStatsChange,
}: CompactOptionsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-700" />
        <h3 className="font-semibold text-gray-800">Display Options</h3>
      </div>

      {/* Display Format */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
          Show
        </label>
        <div className="space-y-1">
          {(["count", "percentage", "both"] as const).map((format) => (
            <label key={format} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value={format}
                checked={displayFormat === format}
                onChange={(e) => onDisplayFormatChange(e.target.value as DisplayFormat)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">
                {format === "count" ? "Count Only" : format === "percentage" ? "% Only" : "Count & %"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Decimal Places */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
          Decimals
        </label>
        <input
          type="number"
          min="0"
          max="5"
          value={decimalPlaces}
          onChange={(e) => onDecimalPlacesChange(parseInt(e.target.value))}
          className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Statistical Tests */}
      <label className="flex items-center gap-2 cursor-pointer p-3 bg-blue-50 rounded border border-blue-200">
        <input
          type="checkbox"
          checked={calculateStats}
          onChange={(e) => onCalculateStatsChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded"
        />
        <div className="flex-1">
          <span className="text-xs font-semibold text-gray-800">Statistical Tests</span>
          <p className="text-xs text-gray-600">Mark significant differences with *, **, ***</p>
        </div>
      </label>
    </div>
  );
}
