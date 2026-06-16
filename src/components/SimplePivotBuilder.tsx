import React, { useState } from "react";
import { X, ArrowDown, ArrowRight, Hash, HelpCircle } from "lucide-react";
import type { PivotConfig } from "../lib/pivotCalculator";
import { FieldFilterGroupMenu } from "./FieldFilterGroupMenu";

interface SimplePivotBuilderProps {
  fields: string[];
  onConfigChange: (config: PivotConfig) => void;
  config: PivotConfig;
  data: Record<string, any>[];
  excludedCategories: Record<string, string[]>;
  onExcludedCategoriesChange: (excluded: Record<string, string[]>) => void;
  groupings: Record<string, Record<string, string[]>>;
  onGroupingsChange: (groupings: Record<string, Record<string, string[]>>) => void;
}

type TargetZone = "rows" | "columns" | "values";

export function SimplePivotBuilder({
  fields,
  onConfigChange,
  config,
  data,
  excludedCategories,
  onExcludedCategoriesChange,
  groupings,
  onGroupingsChange,
}: SimplePivotBuilderProps) {
  const [activeZone, setActiveZone] = useState<TargetZone>("rows");
  const [showHelp, setShowHelp] = useState(true);

  const isUsed = (field: string) =>
    config.rows.includes(field) ||
    config.columns.includes(field) ||
    config.values.some((v) => v.field === field);

  const addField = (field: string, area: TargetZone) => {
    if (area === "values") {
      if (!config.values.some((v) => v.field === field)) {
        onConfigChange({
          ...config,
          values: [...config.values, { field, aggregation: "count" }],
        });
      }
    } else if (!config[area].includes(field)) {
      onConfigChange({ ...config, [area]: [...config[area], field] });
    }
  };

  const removeField = (field: string, area: TargetZone) => {
    if (area === "values") {
      onConfigChange({
        ...config,
        values: config.values.filter((v) => v.field !== field),
      });
    } else {
      onConfigChange({ ...config, [area]: config[area].filter((f) => f !== field) });
    }
  };

  const updateAggregation = (field: string, aggregation: "sum" | "count" | "avg" | "min" | "max") => {
    onConfigChange({
      ...config,
      values: config.values.map((v) => (v.field === field ? { ...v, aggregation } : v)),
    });
  };

  const zones: { id: TargetZone; label: string; icon: React.ReactNode; color: string; hint: string }[] = [
    {
      id: "rows",
      label: "Lignes",
      icon: <ArrowDown className="w-4 h-4" />,
      color: "blue",
      hint: "Variables affichées verticalement à gauche",
    },
    {
      id: "columns",
      label: "Colonnes",
      icon: <ArrowRight className="w-4 h-4" />,
      color: "green",
      hint: "Variables affichées horizontalement en haut",
    },
    {
      id: "values",
      label: "Valeurs",
      icon: <Hash className="w-4 h-4" />,
      color: "orange",
      hint: "Champ à compter ou agréger",
    },
  ];

  const colorClasses: Record<string, { zone: string; chip: string; border: string }> = {
    blue: { zone: "border-blue-400 bg-blue-50", chip: "bg-blue-100 border-blue-400", border: "border-blue-500" },
    green: { zone: "border-green-400 bg-green-50", chip: "bg-green-100 border-green-400", border: "border-green-500" },
    orange: { zone: "border-orange-400 bg-orange-50", chip: "bg-orange-100 border-orange-400", border: "border-orange-500" },
  };

  const getFieldsInZone = (zone: TargetZone): string[] => {
    if (zone === "values") return config.values.map((v) => v.field);
    return config[zone];
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Instructions */}
      {showHelp && (
        <div className="flex items-start gap-3 px-4 py-3 bg-indigo-50 border-b border-indigo-100 rounded-t-lg">
          <HelpCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-indigo-900">
            <p className="font-semibold mb-1">Comment configurer le tableau croisé ?</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs text-indigo-800">
              <li>Cliquez sur une <strong>zone</strong> (Lignes, Colonnes ou Valeurs) pour la sélectionner</li>
              <li>Cliquez sur une <strong>variable</strong> ci-dessous pour l&apos;ajouter à la zone active</li>
              <li>Utilisez <strong>🔍</strong> sur chaque variable pour filtrer (ex. exclure les non-répondants)</li>
              <li>Utilisez <strong>📦 Regroupement</strong> pour fusionner des modalités (ex. &quot;Total satisfait&quot;)</li>
            </ol>
          </div>
          <button type="button" onClick={() => setShowHelp(false)} className="text-indigo-400 hover:text-indigo-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drop zones */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {zones.map((zone) => {
          const colors = colorClasses[zone.color];
          const isActive = activeZone === zone.id;
          const fieldsInZone = getFieldsInZone(zone.id);

          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => setActiveZone(zone.id)}
              className={`text-left rounded-lg border-2 p-3 transition-all ${
                isActive ? `${colors.zone} ring-2 ring-offset-1 ring-${zone.color}-400` : "border-gray-200 bg-gray-50 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {zone.icon}
                <span className="font-bold text-sm text-gray-800">{zone.label}</span>
                {isActive && (
                  <span className="ml-auto text-[10px] bg-white px-1.5 py-0.5 rounded font-medium text-gray-600">
                    zone active
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mb-2">{zone.hint}</p>

              <div className="space-y-1 min-h-[2rem]">
                {fieldsInZone.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aucune variable — cliquez ci-dessous</p>
                ) : (
                  fieldsInZone.map((field) => (
                    <div
                      key={field}
                      className={`flex items-center gap-1 px-2 py-1 rounded border text-xs ${colors.chip}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {zone.id !== "values" && (
                        <FieldFilterGroupMenu
                          field={field}
                          data={data}
                          excludedCategories={excludedCategories}
                          onExcludedCategoriesChange={onExcludedCategoriesChange}
                          groupings={groupings}
                          onGroupingsChange={onGroupingsChange}
                          compact
                        />
                      )}
                      {zone.id === "values" && (
                        <select
                          value={config.values.find((v) => v.field === field)?.aggregation ?? "count"}
                          onChange={(e) => updateAggregation(field, e.target.value as "sum" | "count" | "avg" | "min" | "max")}
                          className="text-[10px] border rounded px-1 py-0.5 bg-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="count">Effectif</option>
                          <option value="sum">Somme</option>
                          <option value="avg">Moyenne</option>
                          <option value="min">Min</option>
                          <option value="max">Max</option>
                        </select>
                      )}
                      <span className="flex-1 truncate font-medium">{field}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(field, zone.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Available fields — select déroulant */}
      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">
          Ajouter une variable à « {zones.find((z) => z.id === activeZone)?.label} » :
        </label>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addField(e.target.value, activeZone);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">— Sélectionner une variable —</option>
          {fields.map((field) => {
            const used = isUsed(field);
            return (
              <option key={field} value={field} disabled={used}>
                {used ? `✓ ${field}` : field}
              </option>
            );
          })}
        </select>
        <p className="text-[10px] text-gray-400 mt-1">
          Les variables déjà utilisées (✓) sont grisées.
        </p>
      </div>
    </div>
  );
}
