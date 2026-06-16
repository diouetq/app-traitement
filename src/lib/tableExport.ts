/**
 * Export CSV / Excel / Image — utilise FileReader.readAsDataURL (blob → base64 data URI)
 * Compatible avec tous les contextes navigateurs, y compris les sandboxes iframe.
 */

import * as XLSX from "xlsx";
import type { AdvancedPivotResult } from "./advancedPivotCalculator";
import type { PercentageType, CellNotation } from "./posthocAnalysis";
import { calculatePercentageByType } from "./posthocAnalysis";

export interface ExportOptions {
  displayFormat: "count" | "percentage" | "both";
  percentageType: PercentageType;
  notations?: CellNotation[];
}

function cellText(
  value: number,
  rowIdx: number,
  colIdx: number,
  result: AdvancedPivotResult,
  options: ExportOptions
): string {
  const rT = result.rowTotals?.[rowIdx] ?? 0;
  const cT = result.columnTotals?.[colIdx] ?? 0;
  const grand = (result.columnTotals ?? [])
    .filter((_, ci) => !result.isGroupCol?.[ci])
    .reduce((a, b) => a + b, 0);

  let text: string;
  if (options.displayFormat === "percentage") {
    text = calculatePercentageByType(value, rT, cT, grand, options.percentageType);
  } else if (options.displayFormat === "both") {
    text = `${value} (${calculatePercentageByType(value, rT, cT, grand, options.percentageType)})`;
  } else {
    text = String(value);
  }

  const n = options.notations?.find((c) => c.row === rowIdx && c.col === colIdx);
  if (n?.higherThan.length) text += " +" + n.higherThan.join("");
  if (n?.lowerThan.length) text += " -" + n.lowerThan.join("");
  return text;
}

/** Télécharge un Blob via FileReader.readAsDataURL (base64 data URI — fonctionne partout) */
function triggerDownload(blob: Blob, filename: string): void {
  const reader = new FileReader();
  reader.onloadend = () => {
    const a = document.createElement("a");
    a.href = reader.result as string;
    a.download = filename;
    a.style.position = "fixed";
    a.style.left = "-9999px";
    a.style.top = "-9999px";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { document.body.removeChild(a); } catch { /* already removed */ }
    }, 3000);
  };
  reader.onerror = () => {
    console.error("FileReader error during export");
    alert("L'export a échoué. Vérifiez la console pour plus de détails.");
  };
  reader.readAsDataURL(blob);
}

export function exportToCSV(result: AdvancedPivotResult, options: ExportOptions) {
  try {
    const lines: string[][] = [["", ...result.headers, "Total"]];

    for (let i = 0; i < result.rows.length; i++) {
      const label = result.rowLabels[i].join(" › ");
      const cells = result.rows[i].map((v, j) => cellText(v as number, i, j, result, options));
      lines.push([label, ...cells, String(result.rowTotals?.[i] ?? 0)]);
    }

    if (result.columnTotals) {
      const grand = (result.columnTotals ?? [])
        .filter((_, ci) => !result.isGroupCol?.[ci])
        .reduce((a, b) => a + b, 0);
      lines.push(["Total", ...result.columnTotals.map(String), String(grand)]);
    }

    const csv = lines
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, "tableau_croise.csv");
  } catch (err) {
    console.error("Export CSV error:", err);
    alert("Erreur export CSV : " + String(err));
  }
}

export function exportToExcel(result: AdvancedPivotResult, options: ExportOptions) {
  try {
    const aoa: (string | number)[][] = [["", ...result.headers, "Total"]];

    for (let i = 0; i < result.rows.length; i++) {
      const cells = result.rows[i].map((v, j) => cellText(v as number, i, j, result, options));
      aoa.push([result.rowLabels[i].join(" › "), ...cells, result.rowTotals?.[i] ?? 0]);
    }

    if (result.columnTotals) {
      const grand = (result.columnTotals ?? [])
        .filter((_, ci) => !result.isGroupCol?.[ci])
        .reduce((a, b) => a + b, 0);
      aoa.push(["Total", ...result.columnTotals, grand]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tableau");

    const ab: ArrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([ab], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    triggerDownload(blob, "tableau_croise.xlsx");
  } catch (err) {
    console.error("Export Excel error:", err);
    alert("Erreur export Excel : " + String(err));
  }
}

export async function exportToImage(element: HTMLElement, filename = "tableau_croise.png") {
  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      ignoreElements: (el) => el.hasAttribute("data-export-ignore"),
    });

    canvas.toBlob((blob) => {
      if (!blob) { alert("Impossible de générer l'image."); return; }
      triggerDownload(blob, filename);
    }, "image/png");
  } catch (e) {
    console.error("Export image échoué :", e);
    alert("Erreur export image : " + String(e));
  }
}
