import React, { useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
import type { DisplayFormat } from "../lib/advancedPivotCalculator";

interface PivotOptionsPanelProps {
  displayFormat: DisplayFormat;
  onDisplayFormatChange: (format: DisplayFormat) => void;
  decimalPlaces: number;
  onDecimalPlacesChange: (places: number) => void;
  calculateStats: boolean;
  onCalculateStatsChange: (calculate: boolean) => void;
}

export function PivotOptionsPanel({
  displayFormat,
  onDisplayFormatChange,
  decimalPlaces,
  onDecimalPlacesChange,
  calculateStats,
  onCalculateStatsChange,
}: PivotOptionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left font-semibold text-gray-800 hover:text-blue-600 transition"
      >
        <Settings className="w-5 h-5" />
        <span>Display Options</span>
        <ChevronDown
          className={`w-5 h-5 ml-auto transition-transform ${
            isExpanded ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {/* Display Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Format
            </label>
            <div className="flex gap-3">
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
                  <span className="text-sm text-gray-700 capitalize">
                    {format === "both" ? "Count & %" : format}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Decimal Places */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decimal Places
            </label>
            <input
              type="number"
              min="0"
              max="5"
              value={decimalPlaces}
              onChange={(e) => onDecimalPlacesChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Statistical Tests */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-md">
            <input
              type="checkbox"
              id="stats"
              checked={calculateStats}
              onChange={(e) => onCalculateStatsChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="stats" className="flex-1 cursor-pointer">
              <span className="font-medium text-gray-800">Calculate Statistical Tests</span>
              <p className="text-xs text-gray-600">Chi-squared & Cramér's V (for categorical data)</p>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
