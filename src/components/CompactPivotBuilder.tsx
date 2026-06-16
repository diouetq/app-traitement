import React, { useState } from "react";
import { X } from "lucide-react";
import type { PivotConfig } from "../lib/pivotCalculator";

interface CompactPivotBuilderProps {
  fields: string[];
  onConfigChange: (config: PivotConfig) => void;
  config: PivotConfig;
}

export function CompactPivotBuilder({
  fields,
  onConfigChange,
  config,
}: CompactPivotBuilderProps) {
  const [filter, setFilter] = useState("");

  const filteredFields = fields.filter((f) =>
    f.toLowerCase().includes(filter.toLowerCase())
  );

  const addField = (field: string, area: keyof PivotConfig) => {
    if (!config[area].includes(field)) {
      const newConfig = { ...config };
      newConfig[area] = [...newConfig[area], field];
      onConfigChange(newConfig);
      setFilter("");
    }
  };

  const removeField = (field: string, area: keyof PivotConfig) => {
    const newConfig = { ...config };
    newConfig[area] = newConfig[area].filter((f) => f !== field);
    onConfigChange(newConfig);
  };

  const addValue = () => {
    const field = filteredFields[0];
    if (field && !config.values.some((v) => v.field === field)) {
      const newConfig = { ...config };
      newConfig.values.push({ field, aggregation: "count" });
      onConfigChange(newConfig);
      setFilter("");
    }
  };

  const updateValueAggregation = (
    field: string,
    aggregation: "sum" | "count" | "avg" | "min" | "max"
  ) => {
    const newConfig = { ...config };
    const idx = newConfig.values.findIndex((v) => v.field === field);
    if (idx >= 0) {
      newConfig.values[idx].aggregation = aggregation;
      onConfigChange(newConfig);
    }
  };

  return (
    <div className="space-y-3">
      {/* Variable search/select */}
      <div>
        <label className="text-xs font-semibold text-gray-600 uppercase">
          Quick Add Variable
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search variables..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {filteredFields.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addField(e.target.value, "rows");
                  e.target.value = "";
                }
              }}
              className="px-2 py-2 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">+Add to Rows</option>
              {filteredFields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Rows */}
      <div>
        <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
          Rows
        </label>
        {config.rows.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Add row variables...</p>
        ) : (
          <div className="space-y-1">
            {config.rows.map((field) => (
              <div key={field} className="flex items-center gap-1 bg-blue-50 p-2 rounded">
                <span className="text-xs font-medium text-gray-700 flex-1">{field}</span>
                <button
                  onClick={() => removeField(field, "rows")}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Columns */}
      <div>
        <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
          Columns
        </label>
        {config.columns.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Add column variables...</p>
        ) : (
          <div className="space-y-1">
            {config.columns.map((field) => (
              <div key={field} className="flex items-center gap-1 bg-green-50 p-2 rounded">
                <span className="text-xs font-medium text-gray-700 flex-1">{field}</span>
                <button
                  onClick={() => removeField(field, "columns")}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Values */}
      <div>
        <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
          Values
        </label>
        {config.values.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Add value fields...</p>
        ) : (
          <div className="space-y-1">
            {config.values.map((value) => (
              <div key={value.field} className="flex items-center gap-1 bg-orange-50 p-2 rounded">
                <select
                  value={value.aggregation}
                  onChange={(e) =>
                    updateValueAggregation(
                      value.field,
                      e.target.value as any
                    )
                  }
                  className="flex-1 px-1 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="sum">Sum</option>
                  <option value="count">Count</option>
                  <option value="avg">Avg</option>
                  <option value="min">Min</option>
                  <option value="max">Max</option>
                </select>
                <span className="text-xs text-gray-600">{value.field}</span>
                <button
                  onClick={() => removeField(value.field, "values")}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick add buttons */}
      <div className="flex gap-2 pt-2 border-t">
        {filteredFields.length > 0 && (
          <>
            <button
              onClick={() => addField(filteredFields[0], "columns")}
              className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Col
            </button>
            <button
              onClick={addValue}
              className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Val
            </button>
          </>
        )}
      </div>
    </div>
  );
}
