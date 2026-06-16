import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, AlertCircle, Loader2 } from "lucide-react";

interface ExcelData {
  sheetNames: string[];
  data: Record<string, any[]>;
  headers: Record<string, string[]>;
}

interface ExcelUploadProps {
  onDataLoaded: (data: ExcelData) => void;
  compact?: boolean;
}

export function ExcelUpload({ onDataLoaded, compact = false }: ExcelUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
      setError("Format non supporté — utilisez .xlsx, .xls ou .csv");
      return;
    }

    setFileName(file.name);
    setLoading(true);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        const sheetNames = workbook.SheetNames;
        const excelData: ExcelData = { sheetNames, data: {}, headers: {} };

        sheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          if (jsonData.length > 0) {
            excelData.data[sheetName] = jsonData as Record<string, any>[];
            excelData.headers[sheetName] = Object.keys(jsonData[0] as object);
          }
        });

        if (Object.keys(excelData.data).length === 0) {
          setError("Aucune donnée trouvée dans le fichier");
          setLoading(false);
          return;
        }

        onDataLoaded(excelData);
      } catch (err) {
        setError(`Erreur de lecture : ${err instanceof Error ? err.message : "inconnue"}`);
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Erreur lors de la lecture du fichier");
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  if (compact) {
    return (
      <div>
        <label className={`flex items-center gap-3 cursor-pointer px-4 py-3 border-2 border-dashed rounded-lg transition ${
          loading ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
        }`}>
          {loading
            ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            : <Upload className="w-5 h-5 text-blue-500" />}
          <span className="text-sm text-gray-700">
            {loading ? `Chargement de « ${fileName} »…` : (fileName || "Cliquez pour choisir un fichier Excel")}
          </span>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" disabled={loading} />
        </label>
        {error && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md border border-gray-200">
      {loading ? (
        <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-10 text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-blue-700">Chargement de « {fileName} »…</p>
          <p className="text-xs text-blue-500 mt-1">Lecture et analyse du fichier en cours, merci de patienter</p>
        </div>
      ) : (
        <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-colors block">
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <span className="text-sm font-medium text-gray-700 block">
            {fileName || "Glissez-déposez ou cliquez pour sélectionner"}
          </span>
          <span className="text-xs text-gray-400 mt-1 block">.xlsx, .xls, .csv</span>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
        </label>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
