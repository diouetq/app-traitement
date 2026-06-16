import React from "react";
import { BarChart3 } from "lucide-react";
import type { AdvancedPivotResult } from "../lib/advancedPivotCalculator";
import { interpretEffectSize } from "../lib/statisticalTests";

interface StatisticalResultsProps {
  result: AdvancedPivotResult | null;
}

export function StatisticalResults({ result }: StatisticalResultsProps) {
  if (!result?.statistics) {
    return null;
  }

  const { statistics } = result;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-md p-6 mb-4 border border-purple-200">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-800">Statistical Analysis</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sample Size */}
        <div className="bg-white rounded-md p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 mb-1">Total Observations</p>
          <p className="text-2xl font-bold text-blue-600">
            {statistics.totalObservations.toLocaleString()}
          </p>
        </div>

        {/* Chi-Squared Test */}
        {statistics.chiSquared && (
          <>
            <div className="bg-white rounded-md p-4 border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">Chi-Squared (χ²)</p>
              <p className="text-2xl font-bold text-green-600">
                {statistics.chiSquared.chiSquared}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                df = {statistics.chiSquared.degreesOfFreedom}
              </p>
            </div>

            <div className="bg-white rounded-md p-4 border-l-4 border-indigo-500">
              <p className="text-sm text-gray-600 mb-1">P-Value</p>
              <p className="text-2xl font-bold text-indigo-600">
                {statistics.chiSquared.pValue.toFixed(4)}
              </p>
              <p className={`text-xs mt-1 font-medium ${
                statistics.chiSquared.significant
                  ? "text-green-600"
                  : "text-orange-600"
              }`}>
                {statistics.chiSquared.significant ? "✓ Significant" : "Not Significant"} (α = 0.05)
              </p>
            </div>

            <div className="bg-white rounded-md p-4 border-l-4 border-orange-500">
              <p className="text-sm text-gray-600 mb-1">Cramér's V (Effect Size)</p>
              <p className="text-2xl font-bold text-orange-600">
                {statistics.cramersV}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {interpretEffectSize(statistics.cramersV || 0, statistics.chiSquared.degreesOfFreedom)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Interpretation Box */}
      {statistics.chiSquared && (
        <div className="mt-4 p-4 bg-white rounded-md border border-gray-200">
          <p className="text-sm font-semibold text-gray-800 mb-2">Interpretation</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {statistics.chiSquared.interpretation}
            {statistics.cramersV && (
              <>
                {" "}The effect size (Cramér's V = {statistics.cramersV}) indicates a{" "}
                <span className="font-semibold">
                  {interpretEffectSize(statistics.cramersV, statistics.chiSquared.degreesOfFreedom).toLowerCase()}
                </span>
                {" "}between the variables.
              </>
            )}
          </p>
        </div>
      )}

      {!statistics.chiSquared && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
          <p className="text-sm text-yellow-800">
            Statistical tests require both row and column variables to be configured.
          </p>
        </div>
      )}
    </div>
  );
}
