import React, { useState, useMemo, useRef, useEffect } from "react";
import { Filter, Layers, ChevronDown, X, Plus, Trash2 } from "lucide-react";
import { normalizeCellValue } from "../lib/posthocAnalysis";

interface FieldFilterGroupMenuProps {
  field: string;
  data: Record<string, any>[];
  excludedCategories: Record<string, string[]>;
  onExcludedCategoriesChange: (excluded: Record<string, string[]>) => void;
  groupings: Record<string, Record<string, string[]>>;
  onGroupingsChange: (groupings: Record<string, Record<string, string[]>>) => void;
  compact?: boolean;
}

export function FieldFilterGroupMenu({
  field,
  data,
  excludedCategories,
  onExcludedCategoriesChange,
  groupings,
  onGroupingsChange,
  compact = false,
}: FieldFilterGroupMenuProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"filter" | "group">("filter");
  const [newGroupName, setNewGroupName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const fieldValues = useMemo(() => {
    const unique = Array.from(new Set(data.map((d) => normalizeCellValue(d[field])))).sort();
    return unique;
  }, [data, field]);

  const excluded = excludedCategories[field] ?? [];
  const fieldGroupings = groupings[field] ?? {};
  const hasFilter = excluded.length > 0;
  const hasGroups = Object.keys(fieldGroupings).length > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleCategory = (category: string) => {
    const updated = { ...excludedCategories };
    if (!updated[field]) updated[field] = [];
    const idx = updated[field].indexOf(category);
    if (idx >= 0) updated[field].splice(idx, 1);
    else updated[field].push(category);
    if (updated[field].length === 0) delete updated[field];
    onExcludedCategoriesChange(updated);
  };

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name || fieldGroupings[name]) return;
    const updated = { ...groupings };
    if (!updated[field]) updated[field] = {};
    updated[field][name] = [];
    onGroupingsChange(updated);
    setNewGroupName("");
  };

  const deleteGroup = (groupName: string) => {
    const updated = { ...groupings };
    if (updated[field]) {
      delete updated[field][groupName];
      if (Object.keys(updated[field]).length === 0) delete updated[field];
    }
    onGroupingsChange(updated);
  };

  const addValueToGroup = (groupName: string, value: string) => {
    const updated = { ...groupings };
    if (!updated[field]) updated[field] = {};
    if (!updated[field][groupName]) updated[field][groupName] = [];
    if (!updated[field][groupName].includes(value)) {
      updated[field][groupName] = [...updated[field][groupName], value].sort();
    }
    onGroupingsChange(updated);
  };

  const removeValueFromGroup = (groupName: string, value: string) => {
    const updated = { ...groupings };
    if (updated[field]?.[groupName]) {
      updated[field][groupName] = updated[field][groupName].filter((v) => v !== value);
    }
    onGroupingsChange(updated);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 rounded-md transition ${
          compact
            ? "px-1.5 py-0.5 text-xs hover:bg-white/20"
            : "px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300"
        } ${hasFilter || hasGroups ? "ring-2 ring-orange-400" : ""}`}
        title="Filtrer ou regrouper les modalités"
      >
        <Filter className="w-3 h-3" />
        {hasFilter && <span className="text-orange-600 font-bold">{excluded.length}✕</span>}
        {hasGroups && <Layers className="w-3 h-3 text-green-600" />}
        <ChevronDown className={`w-3 h-3 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-white border border-gray-300 rounded-lg shadow-xl">
          <div className="px-3 py-2 border-b bg-gray-50 rounded-t-lg">
            <p className="text-xs font-bold text-gray-800 truncate">{field}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Filtre : exclure (ex. non-répondants) · Regroupement : fusionner (ex. Total satisfait)
            </p>
          </div>

          <div className="flex border-b">
            {(["filter", "group"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-medium ${
                  tab === t ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t === "filter" ? "🔍 Filtre" : "📦 Regroupement"}
              </button>
            ))}
          </div>

          <div className="p-3 max-h-64 overflow-y-auto">
            {tab === "filter" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...excludedCategories };
                    if (excluded.length === fieldValues.length) delete updated[field];
                    else updated[field] = [...fieldValues];
                    onExcludedCategoriesChange(updated);
                  }}
                  className="text-xs text-blue-600 hover:underline mb-2"
                >
                  {excluded.length === fieldValues.length ? "Tout inclure" : "Tout exclure"}
                </button>
                <div className="space-y-1">
                  {fieldValues.map((value) => {
                    const isIncluded = !excluded.includes(value);
                    return (
                      <label
                        key={value}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={isIncluded}
                          onChange={() => toggleCategory(value)}
                          className="w-3.5 h-3.5"
                        />
                        <span className={`flex-1 truncate ${!isIncluded ? "line-through text-gray-400" : ""}`}>
                          {value || "(vide)"}
                        </span>
                        {!isIncluded && <X className="w-3 h-3 text-red-400" />}
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {Object.entries(fieldGroupings).map(([groupName, values]) => (
                  <div key={groupName} className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-green-800">{groupName}</span>
                      <button type="button" onClick={() => deleteGroup(groupName)} className="text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {values.map((v) => (
                        <span key={v} className="inline-flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded text-[10px] border">
                          {v}
                          <button type="button" onClick={() => removeValueFromGroup(groupName, v)}>×</button>
                        </span>
                      ))}
                    </div>
                    <select
                      className="w-full text-xs border rounded px-1 py-1"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) addValueToGroup(groupName, e.target.value);
                      }}
                    >
                      <option value="">+ Ajouter modalité...</option>
                      {fieldValues.filter((v) => !values.includes(v)).map((v) => (
                        <option key={v} value={v}>{v || "(vide)"}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Nom du groupe (ex. Total satisfait)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addGroup()}
                    className="flex-1 text-xs border rounded px-2 py-1.5"
                  />
                  <button
                    type="button"
                    onClick={addGroup}
                    className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
