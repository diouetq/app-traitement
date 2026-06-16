/**
 * Post-hoc pairwise comparisons — style institut sondage
 * Lettres fixes par colonne (A, B, C…) + couleur vs total général
 */

export type PercentageType = "total" | "row" | "column";

/** Normalise une valeur de cellule (null/undefined → "") */
export function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function calculatePercentageByType(
  value: number,
  rowTotal: number,
  colTotal: number,
  grandTotal: number,
  percentageType: PercentageType,
  decimalPlaces = 1
): string {
  if (percentageType === "row") {
    return rowTotal > 0 ? ((value / rowTotal) * 100).toFixed(decimalPlaces) + "%" : "0%";
  }
  if (percentageType === "column") {
    return colTotal > 0 ? ((value / colTotal) * 100).toFixed(decimalPlaces) + "%" : "0%";
  }
  return grandTotal > 0 ? ((value / grandTotal) * 100).toFixed(decimalPlaces) + "%" : "0%";
}

/** Retourne les labels fixes de colonnes : A, B, C … Z, AA, AB … */
export function getColumnLabels(nCols: number): string[] {
  return Array.from({ length: nCols }, (_, i) => {
    if (i < 26) return String.fromCharCode(65 + i);
    return String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26));
  });
}

export interface CellNotation {
  row: number;
  col: number;
  /** Lettres des colonnes envers lesquelles cette cellule est sig. SUPÉRIEURE */
  higherThan: string[];
  /** Lettres des colonnes envers lesquelles cette cellule est sig. INFÉRIEURE */
  lowerThan: string[];
  /** Couleur par rapport à la distribution totale */
  direction: "higher" | "lower" | "neutral";
}

/** Z-test bilatéral de comparaison de deux proportions poolées */
function proportionZTest(x1: number, n1: number, x2: number, n2: number): number {
  if (n1 <= 0 || n2 <= 0) return 0;
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pPool = (x1 + x2) / (n1 + n2);
  if (pPool <= 0 || pPool >= 1) return 0;
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  return se === 0 ? 0 : Math.abs(p1 - p2) / se;
}

function zToPValue(z: number): number {
  const t = 1 / (1 + 0.2316419 * z);
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 2 * p;
}

/**
 * Calcule les notations par cellule :
 * - Les lettres (A, B, C…) indiquent avec quelles colonnes la différence est significative
 * - La couleur indique la déviation par rapport à la distribution globale (chi-sq résidus)
 *
 * Seul `percentageType === "row"` ou `"column"` fait sens pour les lettres.
 */
export function computeCellNotations(
  observed: number[][],
  rowTotals: number[],
  colTotals: number[],
  grandTotal: number,
  percentageType: "row" | "column",
  alpha: number = 0.05
): CellNotation[] {
  const results: CellNotation[] = [];
  const colLabels = getColumnLabels(observed[0]?.length ?? 0);
  const nCols = observed[0]?.length ?? 0;

  // Correction Bonferroni sur le nombre de paires
  const numPairs = (nCols * (nCols - 1)) / 2;
  const adjustedAlpha = numPairs > 0 ? alpha / numPairs : alpha;

  for (let i = 0; i < observed.length; i++) {
    for (let j = 0; j < nCols; j++) {
      const higherThan: string[] = [];
      const lowerThan: string[] = [];

      for (let k = 0; k < nCols; k++) {
        if (j === k) continue;

        // Dénominateurs selon la base choisie
        const n1 = percentageType === "row" ? rowTotals[i] : colTotals[j];
        const n2 = percentageType === "row" ? rowTotals[i] : colTotals[k];

        const z = proportionZTest(observed[i][j], n1, observed[i][k], n2);
        const p = zToPValue(z);

        if (p < adjustedAlpha) {
          const p1 = percentageType === "row"
            ? (n1 > 0 ? observed[i][j] / n1 : 0)
            : (n1 > 0 ? observed[i][j] / n1 : 0);
          const p2 = percentageType === "row"
            ? (n2 > 0 ? observed[i][k] / n2 : 0)
            : (n2 > 0 ? observed[i][k] / n2 : 0);

          if (p1 > p2) higherThan.push(colLabels[k]);
          else lowerThan.push(colLabels[k]);
        }
      }

      // Couleur : cette cellule vs sa proportion attendue (résidu standardisé)
      const expected = grandTotal > 0 ? (rowTotals[i] * colTotals[j]) / grandTotal : 0;
      let direction: "higher" | "lower" | "neutral" = "neutral";
      if (expected > 0) {
        const stdResidual = (observed[i][j] - expected) / Math.sqrt(expected);
        if (stdResidual > 1.96) direction = "higher";
        else if (stdResidual < -1.96) direction = "lower";
      }

      results.push({ row: i, col: j, higherThan, lowerThan, direction });
    }
  }

  return results;
}

export function getCellNotation(
  row: number,
  col: number,
  cells: CellNotation[]
): CellNotation | undefined {
  return cells.find((c) => c.row === row && c.col === col);
}

export const STATS_HELP = {
  title: "Test Z de comparaison de proportions (Bonferroni α=0,05)",
  description:
    "Chaque colonne reçoit une lettre fixe (A, B, C…) affichée dans son en-tête. " +
    "Dans les cellules, les lettres en vert indiquent les colonnes envers lesquelles cette cellule est significativement SUPÉRIEURE, " +
    "en rouge les colonnes envers lesquelles elle est significativement INFÉRIEURE. " +
    "La teinte de fond (vert clair / rouge clair) indique la déviation par rapport à la distribution globale (résidu standardisé > 1,96).",
};
