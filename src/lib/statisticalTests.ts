/**
 * Statistical Tests for Survey Data Analysis
 * Provides chi-squared tests and other statistical functions
 */

export interface ChiSquaredResult {
  testName: string;
  chiSquared: number;
  pValue: number;
  degreesOfFreedom: number;
  significant: boolean;
  interpretation: string;
}

export interface DescriptiveStats {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  count: number;
}

/**
 * Calculate chi-squared test statistic
 * Used for testing independence between categorical variables
 */
export function calculateChiSquared(
  observed: number[][],
  expectedMatrix?: number[][]
): ChiSquaredResult {
  // Calculate expected values if not provided
  let expected = expectedMatrix;
  
  if (!expected) {
    expected = calculateExpectedFrequencies(observed);
  }

  let chiSquared = 0;
  let totalCells = 0;

  for (let i = 0; i < observed.length; i++) {
    for (let j = 0; j < observed[i].length; j++) {
      if (expected[i][j] > 0) {
        const diff = observed[i][j] - expected[i][j];
        chiSquared += (diff * diff) / expected[i][j];
        totalCells++;
      }
    }
  }

  const df = (observed.length - 1) * (observed[0].length - 1);
  const pValue = chiSquaredToPValue(chiSquared, df);
  const significant = pValue < 0.05;

  return {
    testName: "Chi-Squared Test",
    chiSquared: Math.round(chiSquared * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    degreesOfFreedom: df,
    significant,
    interpretation: significant
      ? "The variables are significantly associated (p < 0.05)"
      : "No significant association found between variables (p >= 0.05)",
  };
}

/**
 * Calculate expected frequencies for chi-squared test
 */
function calculateExpectedFrequencies(observed: number[][]): number[][] {
  const rows = observed.length;
  const cols = observed[0].length;
  const expected: number[][] = [];

  // Calculate row and column totals
  const rowTotals = observed.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals: number[] = [];
  for (let j = 0; j < cols; j++) {
    colTotals[j] = 0;
    for (let i = 0; i < rows; i++) {
      colTotals[j] += observed[i][j];
    }
  }

  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  // Calculate expected frequencies
  for (let i = 0; i < rows; i++) {
    expected[i] = [];
    for (let j = 0; j < cols; j++) {
      expected[i][j] = (rowTotals[i] * colTotals[j]) / grandTotal;
    }
  }

  return expected;
}

/**
 * Approximate p-value from chi-squared statistic
 * Using approximation for common degrees of freedom
 */
function chiSquaredToPValue(chiSquared: number, df: number): number {
  // Simplified chi-squared CDF approximation
  // For production, consider using jstat or similar library
  
  const criticalValues: Record<number, number[]> = {
    1: [3.841, 5.024, 6.635, 7.879],
    2: [5.991, 7.378, 9.21, 10.597],
    3: [7.815, 9.348, 11.345, 12.838],
    4: [9.488, 11.143, 13.277, 14.86],
    5: [11.07, 12.833, 15.086, 16.75],
    6: [12.592, 14.449, 16.812, 18.548],
  };

  const alphaLevels = [0.05, 0.025, 0.01, 0.005];
  const critical = criticalValues[df] || criticalValues[6];

  if (chiSquared < critical[0]) return 0.05;
  if (chiSquared < critical[1]) return 0.025;
  if (chiSquared < critical[2]) return 0.01;
  if (chiSquared < critical[3]) return 0.005;
  return 0.001;
}

/**
 * Calculate Cramér's V statistic (effect size for chi-squared)
 */
export function calculateCramersV(
  chiSquared: number,
  n: number,
  minDim: number
): number {
  const v = Math.sqrt(chiSquared / (n * (minDim - 1)));
  return Math.round(v * 1000) / 1000;
}

/**
 * Calculate percentage and format
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 1
): string {
  if (total === 0) return "0%";
  const pct = (value / total) * 100;
  return pct.toFixed(decimals) + "%";
}

/**
 * Calculate descriptive statistics
 */
export function calculateDescriptiveStats(values: number[]): DescriptiveStats {
  if (values.length === 0) {
    return { mean: 0, median: 0, std: 0, min: 0, max: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median =
    values.length % 2 === 0
      ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
      : sorted[Math.floor(values.length / 2)];

  const variance =
    values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    std: Math.round(std * 100) / 100,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

/**
 * Interpret effect size (Cramér's V)
 */
export function interpretEffectSize(v: number, df: number): string {
  if (v < 0.1) return "Negligible effect";
  if (v < 0.3) return "Small effect";
  if (v < 0.5) return "Medium effect";
  return "Large effect";
}
