import React, { useState } from "react";
import { GripVertical, X, Plus, Trash2 } from "lucide-react";
import type { PivotConfig } from "@/lib/pivotCalculator";

interface PivotTableBuilderProps {
  fields: string[];
  onConfigChange: (config: PivotConfig) => void;
}

type DragSource = "fields" | "rows" | "columns" | "values";

export function PivotTableBuilder({ fields, onConfigChange }: PivotTableBuilderProps) {
  const [config, setConfig] = useState<PivotConfig>({
    rows: [],
    columns: [],
    values: [],
  });

  const [draggedItem, setDraggedItem] = useState<{
    source: DragSource;
    item: string | number;
  } | null>(null);

  const updateConfig = (newConfig: PivotConfig) => {
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleDragStart = (e: React.DragEvent, source: DragSource, item: string | number) => {
    setDraggedItem({ source, item });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnArea = (target: "rows" | "columns" | "values") => {
    if (!draggedItem) return;

    const { source, item } = draggedItem;

    // Remove from source
    let newConfig = { ...config };

    if (source === "rows") {
      newConfig.rows = newConfig.rows.filter((f) => f !== item);
    } else if (source === "columns") {
      newConfig.columns = newConfig.columns.filter((f) => f !== item);
    } else if (source === "values") {
      newConfig.values = newConfig.values.filter((v) => v.field !== item);
    }

    // Add to target
    if (target === "rows" && typeof item === "string" && !newConfig.rows.includes(item)) {
      newConfig.rows.push(item);
    } else if (target === "columns" && typeof item === "string" && !newConfig.columns.includes(item)) {
      newConfig.columns.push(item);
    } else if (target === "values" && typeof item === "string") {
      if (!newConfig.values.some((v) => v.field === item)) {
        newConfig.values.push({ field: item, aggregation: "sum" });
      }
    }

    updateConfig(newConfig);
    setDraggedItem(null);
  };

  const removeField = (area: "rows" | "columns", field: string) => {
    const newConfig = { ...config };
    if (area === "rows") {
      newConfig.rows = newConfig.rows.filter((f) => f !== field);
    } else {
      newConfig.columns = newConfig.columns.filter((f) => f !== field);
    }
    updateConfig(newConfig);
  };

  const removeValue = (field: string) => {
    const newConfig = { ...config };
    newConfig.values = newConfig.values.filter((v) => v.field !== field);
    updateConfig(newConfig);
  };

  const updateValueAggregation = (field: string, aggregation: "sum" | "count" | "avg" | "min" | "max") => {
    const newConfig = { ...config };
    const valueItem = newConfig.values.find((v) => v.field === field);
    if (valueItem) {
      valueItem.aggregation = aggregation;
    }
    updateConfig(newConfig);
  };

  const availableFields = fields.filter(
    (f) => !config.rows.includes(f) && !config.columns.includes(f) && !config.values.some((v) => v.field === f),
  );

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800">Pivot Table Builder</h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Available Fields */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-64">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Fields
            </h3>
            <div className="space-y-2">
              {availableFields.map((field) => (
                <div
                  key={field}
                  draggable
                  onDragStart={(e) => handleDragStart(e, "fields", field)}
                  className="p-3 bg-blue-50 border border-blue-200 rounded cursor-move hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <GripVertical className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 truncate">{field}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drop Zones */}
        <div className="lg:col-span-4 space-y-4">
          {/* Rows */}
          <DropZone
            title="Rows"
            area="rows"
            items={config.rows}
            onDragOver={handleDragOver}
            onDrop={() => handleDropOnArea("rows")}
            onDragStart={handleDragStart}
            onRemove={(field) => removeField("rows", field)}
            isValueField={false}
          />

          {/* Columns */}
          <DropZone
            title="Columns"
            area="columns"
            items={config.columns}
            onDragOver={handleDragOver}
            onDrop={() => handleDropOnArea("columns")}
            onDragStart={handleDragStart}
            onRemove={(field) => removeField("columns", field)}
            isValueField={false}
          />

          {/* Values */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-32">
            <h3 className="font-semibold text-gray-700 mb-3">Values</h3>
            <div
              onDragOver={handleDragOver}
              onDrop={() => handleDropOnArea("values")}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-24 bg-gray-50"
            >
              {config.values.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">Drag fields here to add values</p>
              ) : (
                <div className="space-y-2">
                  {config.values.map((value) => (
                    <div
                      key={value.field}
                      className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded p-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-700">{value.field}</span>
                      </div>
                      <select
                        value={value.aggregation}
                        onChange={(e) =>
                          updateValueAggregation(value.field, e.target.value as any)
                        }
                        className="text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50"
                      >
                        <option value="sum">Sum</option>
                        <option value="count">Count</option>
                        <option value="avg">Average</option>
                        <option value="min">Min</option>
                        <option value="max">Max</option>
                      </select>
                      <button
                        onClick={() => removeValue(value.field)}
                        className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DropZoneProps {
  title: string;
  area: "rows" | "columns";
  items: string[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragStart: (e: React.DragEvent, source: DragSource, item: string) => void;
  onRemove: (field: string) => void;
  isValueField: boolean;
}

function DropZone({
  title,
  items,
  onDragOver,
  onDrop,
  onDragStart,
  onRemove,
}: DropZoneProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-24 bg-gray-50"
      >
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center">Drag fields here</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((field) => (
              <div
                key={field}
                draggable
                onDragStart={(e) => onDragStart(e, "rows", field)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-full px-3 py-2 cursor-move hover:shadow-md transition-shadow"
              >
                <GripVertical className="w-3 h-3 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">{field}</span>
                <button
                  onClick={() => onRemove(field)}
                  className="ml-1 p-0.5 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
