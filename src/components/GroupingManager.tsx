import React, { useState, useMemo } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

interface GroupingManagerProps {
  data: Record<string, any>[];
  availableFields: string[];
  groupings: Record<string, Record<string, string[]>>;
  onGroupingsChange: (groupings: Record<string, Record<string, string[]>>) => void;
}

export function GroupingManager({
  data,
  availableFields,
  groupings,
  onGroupingsChange,
}: GroupingManagerProps) {
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState<Record<string, string>>({});

  // Get unique values for each field
  const fieldValues = useMemo(() => {
    const values: Record<string, string[]> = {};
    for (const field of availableFields) {
      const unique = Array.from(new Set(data.map((d) => String(d[field] || "")))).sort();
      values[field] = unique;
    }
    return values;
  }, [data, availableFields]);

  const addGroup = (field: string) => {
    const groupName = newGroupName[field]?.trim();
    if (!groupName) return;

    const fieldGroupings = groupings[field] || {};
    if (groupName in fieldGroupings) {
      alert("Group name already exists");
      return;
    }

    const updated = { ...groupings };
    if (!updated[field]) updated[field] = {};
    updated[field][groupName] = [];

    onGroupingsChange(updated);
    setNewGroupName({ ...newGroupName, [field]: "" });
  };

  const deleteGroup = (field: string, groupName: string) => {
    const updated = { ...groupings };
    if (updated[field]) {
      delete updated[field][groupName];
      if (Object.keys(updated[field]).length === 0) {
        delete updated[field];
      }
    }
    onGroupingsChange(updated);
  };

  const addValueToGroup = (field: string, groupName: string, value: string) => {
    const updated = { ...groupings };
    if (!updated[field]) updated[field] = {};
    if (!updated[field][groupName]) updated[field][groupName] = [];

    if (!updated[field][groupName].includes(value)) {
      updated[field][groupName].push(value);
      updated[field][groupName].sort();
    }

    onGroupingsChange(updated);
  };

  const removeValueFromGroup = (
    field: string,
    groupName: string,
    value: string
  ) => {
    const updated = { ...groupings };
    if (updated[field]?.[groupName]) {
      updated[field][groupName] = updated[field][groupName].filter(
        (v) => v !== value
      );
    }
    onGroupingsChange(updated);
  };

  const hasGroupings = Object.values(groupings).some(
    (v) => Object.keys(v).length > 0
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Plus className="w-5 h-5 text-gray-700" />
        <h3 className="font-semibold text-gray-800">Create Groupings</h3>
        {hasGroupings && (
          <span className="ml-auto bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
            Active Groupings
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-3">
        Combine multiple categories into one for cleaner analysis
      </p>

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
                {Object.keys(groupings[field] || {}).length > 0 && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    {Object.keys(groupings[field]).length} groups
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
              <div className="bg-gray-50 border-t p-3 space-y-3">
                {/* Existing groups */}
                {Object.entries(groupings[field] || {}).map(([groupName, values]) => (
                  <div key={groupName} className="bg-white p-3 rounded-md border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-800">{groupName}</h4>
                      <button
                        onClick={() => deleteGroup(field, groupName)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Values in group */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {values.map((value) => (
                        <span
                          key={value}
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-1"
                        >
                          {value}
                          <button
                            onClick={() =>
                              removeValueFromGroup(field, groupName, value)
                            }
                            className="hover:text-blue-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add values to group */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addValueToGroup(field, groupName, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white cursor-pointer"
                    >
                      <option value="">+ Add category...</option>
                      {(fieldValues[field] || [])
                        .filter((v) => !values.includes(v))
                        .map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}

                {/* Create new group */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New group name..."
                    value={newGroupName[field] || ""}
                    onChange={(e) =>
                      setNewGroupName({ ...newGroupName, [field]: e.target.value })
                    }
                    onKeyPress={(e) => {
                      if (e.key === "Enter") addGroup(field);
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => addGroup(field)}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
