import React, { useState, useMemo } from "react";
import { ChevronDown, Filter, X } from "lucide-react";

interface ModalityFilterProps {
  data: Record<string, any>[];
  availableFields: string[];
  excludedCategories: Record<string, string[]>;
  onExcludedCategoriesChange: (excluded: Record<string, string[]>) => void;
}

export function ModalityFilter({
  data,
  availableFields,
  excludedCategories,
  onExcludedCategoriesChange,
}: ModalityFilterProps) {
  const [expandedField, setExpandedField] = useState<string | null>(null);

  // Get unique values for each field
  const fieldValues = useMemo(() => {
    const values: Record<string, string[]> = {};
    for (const field of availableFields) {
      const unique = Array.from(new Set(data.map((d) => String(d[field] || "")))).sort();
      values[field] = unique;
    }
    return values;
  }, [data, availableFields]);

  const toggleCategory = (field: string, category: string) => {
    const excluded = { ...excludedCategories };
    if (!excluded[field]) excluded[field] = [];

    const idx = excluded[field].indexOf(category);
    if (idx >= 0) {
      excluded[field].splice(idx, 1);
    } else {
      excluded[field].push(category);
    }

    if (excluded[field].length === 0) {
      delete excluded[field];
    }

    onExcludedCategoriesChange(excluded);
  };

  const toggleAllCategories = (field: string) => {
    const excluded = { ...excludedCategories };
    const fieldUnique = fieldValues[field] || [];

    if (excluded[field]?.length === fieldUnique.length) {
      // All excluded, include all
      delete excluded[field];
    } else {
      // Include all -> exclude all
      excluded[field] = fieldUnique;
    }

    if (excluded[field]?.length === 0) {
      delete excluded[field];
    }

    onExcludedCategoriesChange(excluded);
  };

  const hasExclusions = Object.values(excludedCategories).some((v) => v.length > 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-5 h-5 text-gray-700" />
        <h3 className="font-semibold text-gray-800">Filter Modalities</h3>
        {hasExclusions && (
          <span className="ml-auto bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
            Active Filters
          </span>
        )}
      </div>

      <div className="space-y-2">
        {availableFields.map((field) => (
          <div key={field} className="border border-gray-200 rounded-md">
            <button
              onClick={() =>
                setExpandedField(expandedField === field ? null : field)
              }
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
            >
              <span className="font-medium text-gray-700">{field}</span>
              <div className="flex items-center gap-2">
                {excludedCategories[field]?.length > 0 && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                    {excludedCategories[field].length} excluded
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    expandedField === field ? "transform rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {expandedField === field && (
              <div className="bg-gray-50 border-t p-3 space-y-2">
                <button
                  onClick={() => toggleAllCategories(field)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium mb-2"
                >
                  {excludedCategories[field]?.length === (fieldValues[field]?.length || 0)
                    ? "Include All"
                    : "Exclude All"}
                </button>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(fieldValues[field] || []).map((value) => {
                    const isExcluded = excludedCategories[field]?.includes(value);
                    return (
                      <label
                        key={value}
                        className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white rounded"
                      >
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => toggleCategory(field, value)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700 flex-1">{value}</span>
                        {isExcluded && (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasExclusions && (
        <button
          onClick={() => onExcludedCategoriesChange({})}
          className="mt-3 w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-300 rounded-md hover:bg-blue-50 transition"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
