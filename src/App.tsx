//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState, useMemo, useEffect, useRef } from "react";
import { ExcelUpload } from "./components/ExcelUpload";
import { SimplePivotBuilder } from "./components/SimplePivotBuilder";
import { StreamlinedTable } from "./components/StreamlinedTable";
import { calculateAdvancedPivot, type AdvancedPivotConfig, type DisplayFormat } from "./lib/advancedPivotCalculator";
import type { PercentageType } from "./lib/posthocAnalysis";
import { BarChart3, FileUp, RefreshCw } from "lucide-react";
import type { PivotConfig } from "./lib/pivotCalculator";

interface ExcelData {
  sheetNames: string[];
  data: Record<string, any[]>;
  headers: Record<string, string[]>;
}

function App() {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [showReimport, setShowReimport] = useState(false);
  const reimportRef = useRef<HTMLDivElement>(null);

  const [pivotConfig, setPivotConfig] = useState<PivotConfig>({
    rows: [],
    columns: [],
    values: [],
  });

  const [displayFormat, setDisplayFormat] = useState<DisplayFormat>("count");
  const [percentageType, setPercentageType] = useState<PercentageType>("total");
  const [decimalPlaces, setDecimalPlaces] = useState(0);
  const [calculateStats, setCalculateStats] = useState(false);
  const [alpha, setAlpha] = useState(0.05);
  const [excludedCategories, setExcludedCategories] = useState<Record<string, string[]>>({});
  const [groupings, setGroupings] = useState<Record<string, Record<string, string[]>>>({});
  const [weightField, setWeightField] = useState<string>("");
  const [showRaw, setShowRaw] = useState(false);

  // Auto-select single sheet
  useEffect(() => {
    if (excelData && excelData.sheetNames.length === 1 && !selectedSheet) {
      setSelectedSheet(excelData.sheetNames[0]);
    }
  }, [excelData, selectedSheet]);

  const handleDataLoaded = (data: ExcelData, name?: string) => {
    setExcelData(data);
    setSelectedSheet(data.sheetNames.length === 1 ? data.sheetNames[0] : "");
    setPivotConfig({ rows: [], columns: [], values: [] });
    setExcludedCategories({});
    setGroupings({});
    setWeightField("");
    if (name) setFileName(name);
    setShowReimport(false);
  };

  const pivotResult = useMemo(() => {
    if (!excelData || !selectedSheet) return null;
    const sheetData = excelData.data[selectedSheet] || [];

    const advancedConfig: AdvancedPivotConfig = {
      ...pivotConfig,
      displayFormat,
      excludedCategories,
      groupings,
      calculateStats,
      decimalPlaces,
      weightField: weightField || undefined,
    };

    return calculateAdvancedPivot(sheetData, advancedConfig);
  }, [excelData, selectedSheet, pivotConfig, displayFormat, excludedCategories, groupings, calculateStats, decimalPlaces]);

  const availableFields = selectedSheet ? excelData?.headers[selectedSheet] || [] : [];
  const sheetData = selectedSheet ? excelData?.data[selectedSheet] || [] : [];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6" />
              <div>
                <h1 className="text-lg font-bold leading-tight">Analyse Tableau Croisé</h1>
                {fileName && (
                  <p className="text-xs text-blue-200 truncate max-w-[300px]">{fileName}</p>
                )}
              </div>
            </div>

            {excelData && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Sheet selector — compact, only if multiple sheets */}
                {excelData.sheetNames.length > 1 && (
                  <select
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded bg-blue-800 text-white border border-blue-500 focus:outline-none"
                  >
                    <option value="">Feuille...</option>
                    {excelData.sheetNames.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setShowReimport(!showReimport)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Réimporter
                </button>
              </div>
            )}
          </div>

          {/* Reimport panel — slides down */}
          {showReimport && excelData && (
            <div ref={reimportRef} className="mt-3 p-3 bg-white rounded-lg shadow-inner">
              <p className="text-xs text-gray-600 mb-2">
                Sélectionnez un nouveau fichier Excel — la configuration actuelle sera réinitialisée.
              </p>
              <ExcelUpload
                onDataLoaded={(data) => handleDataLoaded(data)}
                compact
              />
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {!excelData ? (
          <div className="max-w-2xl mx-auto mt-16 px-4">
            <div className="text-center mb-6">
              <FileUp className="w-14 h-14 text-blue-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Importer un fichier Excel</h2>
              <p className="text-gray-500 text-sm">Glissez-déposez ou cliquez pour sélectionner (.xlsx, .xls, .csv)</p>
            </div>
            <ExcelUpload onDataLoaded={(data) => handleDataLoaded(data)} />
          </div>
        ) : selectedSheet ? (
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
            {/* Pivot configuration — always at top */}
            <SimplePivotBuilder
              fields={availableFields}
              config={pivotConfig}
              onConfigChange={setPivotConfig}
              data={sheetData}
              excludedCategories={excludedCategories}
              onExcludedCategoriesChange={setExcludedCategories}
              groupings={groupings}
              onGroupingsChange={setGroupings}
            />

            {/* Display options */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center gap-6 flex-wrap">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase mr-2">Affichage</span>
                {(["count", "percentage", "both"] as const).map((fmt) => (
                  <label key={fmt} className="inline-flex items-center gap-1 mr-3 cursor-pointer text-sm">
                    <input type="radio" checked={displayFormat === fmt} onChange={() => setDisplayFormat(fmt)} className="w-3.5 h-3.5" />
                    {fmt === "count" ? "Effectifs" : fmt === "percentage" ? "Pourcentages" : "Les deux"}
                  </label>
                ))}
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer text-sm px-3 py-1.5 bg-blue-50 rounded border border-blue-200">
                <input type="checkbox" checked={calculateStats} onChange={(e) => setCalculateStats(e.target.checked)} className="w-3.5 h-3.5" />
                Test Z de proportions
              </label>

              {calculateStats && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Seuil</span>
                  <select value={alpha} onChange={(e) => setAlpha(parseFloat(e.target.value))}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white">
                    <option value={0.10}>90%</option>
                    <option value={0.05}>95%</option>
                    <option value={0.01}>99%</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Décimales</span>
                <select value={decimalPlaces} onChange={(e) => setDecimalPlaces(parseInt(e.target.value))}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white">
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>

              {/* Pondération */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Pondération :</span>
                <select
                  value={weightField}
                  onChange={(e) => setWeightField(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
                >
                  <option value="">Aucune (effectifs bruts)</option>
                  {availableFields.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                {weightField && (
                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} className="w-3 h-3" />
                    Afficher n brut
                  </label>
                )}
              </div>
            </div>

            <StreamlinedTable
              result={pivotResult}
              data={sheetData}
              pivotConfig={pivotConfig}
              excludedCategories={excludedCategories}
              onExcludedCategoriesChange={setExcludedCategories}
              groupings={groupings}
              onGroupingsChange={setGroupings}
              percentageType={percentageType}
              onPercentageTypeChange={setPercentageType}
              displayFormat={displayFormat}
              calculateStats={calculateStats}
              alpha={alpha}
              decimalPlaces={decimalPlaces}
              showRaw={showRaw && !!weightField}
            />
          </div>
        ) : (
          <div className="max-w-md mx-auto mt-20 text-center px-4">
            <p className="text-gray-600 mb-3">Ce fichier contient plusieurs feuilles — choisissez-en une dans l&apos;en-tête.</p>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-600 focus:outline-none"
            >
              <option value="">Sélectionner une feuille...</option>
              {excelData.sheetNames.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
