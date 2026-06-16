/**
 * Pivot table calculation logic
 */

export interface PivotConfig {
  rows: string[];
  columns: string[];
  values: {
    field: string;
    aggregation: "sum" | "count" | "avg" | "min" | "max";
  }[];
}

export interface PivotResult {
  headers: string[];
  rows: (string | number)[][];
  rowLabels: string[];
  columnLabels: string[];
}

/**
 * Calculate a pivot table from data
 */
export function calculatePivot(
  data: any[],
  config: PivotConfig,
): PivotResult {
  if (data.length === 0 || config.rows.length === 0) {
    return {
      headers: [],
      rows: [],
      rowLabels: [],
      columnLabels: [],
    };
  }

  // Build row and column keys
  const rowMap = new Map<string, Map<string, any[]>>();

  data.forEach((row) => {
    const rowKey = config.rows.map((field) => String(row[field] ?? "")).join("|");
    const colKey = config.columns.map((field) => String(row[field] ?? "")).join("|");

    if (!rowMap.has(rowKey)) {
      rowMap.set(rowKey, new Map());
    }

    const colMap = rowMap.get(rowKey)!;
    if (!colMap.has(colKey)) {
      colMap.set(colKey, []);
    }

    colMap.get(colKey)!.push(row);
  });

  // Get unique column keys
  const columnKeysSet = new Set<string>();
  rowMap.forEach((colMap) => {
    colMap.forEach((_, colKey) => columnKeysSet.add(colKey));
  });

  const columnKeys = Array.from(columnKeysSet).sort();
  const rowKeys = Array.from(rowMap.keys()).sort();

  // Helper to get display label
  const getLabel = (key: string, fields: string[]) => {
    if (fields.length === 0) return "Total";
    return key.split("|").join(" / ");
  };

  // Build headers
  const headers: string[] = [];
  config.rows.forEach(() => headers.push(""));
  columnKeys.forEach((colKey) => {
    config.values.forEach((val) => {
      headers.push(getLabel(colKey, config.columns) + ` (${val.aggregation})`);
    });
  });

  // Build rows
  const resultRows: (string | number)[][] = [];

  rowKeys.forEach((rowKey) => {
    const resultRow: (string | number)[] = [];

    // Add row labels
    rowKey.split("|").forEach((label) => {
      resultRow.push(label);
    });

    // Add values
    const colMap = rowMap.get(rowKey)!;
    columnKeys.forEach((colKey) => {
      const values = colMap.get(colKey) || [];
      config.values.forEach((valueConfig) => {
        resultRow.push(aggregateValues(values, valueConfig.field, valueConfig.aggregation));
      });
    });

    resultRows.push(resultRow);
  });

  return {
    headers,
    rows: resultRows,
    rowLabels: rowKeys.map((key) => getLabel(key, config.rows)),
    columnLabels: columnKeys.map((key) => getLabel(key, config.columns)),
  };
}

/**
 * Aggregate values using the specified aggregation function
 */
function aggregateValues(
  values: any[],
  field: string,
  aggregation: "sum" | "count" | "avg" | "min" | "max",
): number {
  if (values.length === 0) return 0;

  switch (aggregation) {
    case "sum": {
      return values.reduce((acc, v) => acc + (parseFloat(v[field]) || 0), 0);
    }
    case "count": {
      return values.length;
    }
    case "avg": {
      const sum = values.reduce((acc, v) => acc + (parseFloat(v[field]) || 0), 0);
      return sum / values.length;
    }
    case "min": {
      const numbers = values.map((v) => parseFloat(v[field]) || 0);
      return Math.min(...numbers);
    }
    case "max": {
      const numbers = values.map((v) => parseFloat(v[field]) || 0);
      return Math.max(...numbers);
    }
  }
}
