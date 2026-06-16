# Excel Pivot Table Builder - Project Guide

## 🎯 Overview

This is a Fabric App built with Rayfin that allows users to:
1. **Upload Excel files** (.xlsx, .xls, or .csv)
2. **Build pivot tables** interactively using drag-and-drop
3. **Preview results** in real-time
4. **Deploy to Fabric** when ready

## 📁 Project Structure

```
App_1/
├── src/
│   ├── components/
│   │   ├── ExcelUpload.tsx           # File upload interface
│   │   ├── PivotTableBuilder.tsx     # Drag-and-drop pivot builder
│   │   ├── PivotTablePreview.tsx     # Results display
│   │   └── auth-gate.component.tsx   # Authentication wrapper
│   ├── lib/
│   │   ├── pivotCalculator.ts        # Pivot calculation engine
│   │   └── ... (other utilities)
│   ├── hooks/
│   │   ├── use-semantic-model-query.ts  # Query Fabric data
│   │   └── use-auth.tsx              # Authentication hook
│   ├── App.tsx                       # Main application
│   ├── main.tsx                      # Entry point
│   └── global.css                    # Global styles
├── package.json                      # Dependencies
└── vite.config.ts                    # Build configuration
```

## 🚀 Features Implemented

### 1. **Excel Upload Component** (`ExcelUpload.tsx`)
- Drag-and-drop file upload
- Support for .xlsx, .xls, and .csv files
- Automatic sheet parsing with XLSX library
- Error handling and validation

### 2. **Pivot Table Builder** (`PivotTableBuilder.tsx`)
- **Drag-and-drop interface** for field management
- **Three drop zones:**
  - **Rows**: Fields to group by in rows
  - **Columns**: Fields to group by in columns
  - **Values**: Numeric fields to aggregate
- **Aggregation functions:** Sum, Count, Average, Min, Max
- Real-time configuration updates

### 3. **Pivot Calculator** (`pivotCalculator.ts`)
- Efficient pivot table calculation algorithm
- Supports multiple aggregations
- Handles nested grouping (rows × columns)

### 4. **Preview Component** (`PivotTablePreview.tsx`)
- Table display with formatted numbers
- Responsive design
- Loading states and empty states

## 💻 How to Use

### Local Development

```bash
# Start the dev server
npm run dev

# The app will be available at http://localhost:5173/
```

### Using the App

1. **Upload Excel**: Click the upload area or drag-drop an Excel file
2. **Select Sheet**: If multiple sheets, choose which one to analyze
3. **Configure Pivot**:
   - Drag fields to **Rows** (vertical grouping)
   - Drag fields to **Columns** (horizontal grouping)
   - Drag numeric fields to **Values** (what to aggregate)
4. **View Results**: The pivot table updates live as you configure it

## 🔧 Technical Details

### Dependencies Added

```json
{
  "xlsx": "Latest version"  // Excel file parsing
}
```

### Core Technologies

- **React 19**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Vite**: Build tool
- **Rayfin**: Fabric integration
- **XLSX**: Excel parsing

## 📊 Pivot Table Calculation

The pivot calculator:
1. Groups data by row fields and column fields
2. Aggregates values using specified functions (sum, count, avg, min, max)
3. Returns structured data with:
   - `headers`: Column headers
   - `rows`: Aggregated data
   - `rowLabels`: Row group labels
   - `columnLabels`: Column group labels

## 🎨 UI/UX Design

- **Modern gradient backgrounds** (blue to indigo theme)
- **Drag-and-drop visual feedback** (hover effects)
- **Step-by-step workflow** (numbered sections 1-4)
- **Responsive grid layout** (adapts to mobile/tablet/desktop)
- **Smooth transitions** (Framer Motion compatible)

## 🚢 Deployment to Fabric

When ready to deploy:

```bash
# Build the application
npm run build

# Deploy to your Fabric workspace
npx rayfin up
```

This will deploy your app to the "TEST" workspace configured during setup.

## 🔌 Integration with Fabric Semantic Models

To use real Fabric data instead of Excel:

1. Configure your semantic model in `fabric.yaml`
2. Use the `useSemanticModelQuery` hook:
   ```typescript
   const { data } = useSemanticModelQuery({
     connection: "myModel",
     query: "EVALUATE SUMMARIZE(...)"
   });
   ```

## 🐛 Troubleshooting

### Changes not showing up?
- The dev server has hot-reload enabled. Refresh the browser if needed.
- Check the browser console for any errors.

### Excel file not loading?
- Ensure the file is not corrupted
- Try a CSV export from Excel
- Check that the file has at least one sheet with data

### Pivot table not calculating?
- Ensure you've selected rows or values
- Check that numeric fields are dragged to "Values"
- Verify data types in your Excel file

## 📝 Next Steps

1. **Test the app locally** at http://localhost:5173/
2. **Try uploading an Excel file** with sample data
3. **Configure different pivot tables** to explore functionality
4. **Customize styling** by modifying Tailwind classes
5. **Connect to Fabric data** when ready for production

## 📚 Resources

- [Rayfin Documentation](https://aka.ms/rayfin-docs)
- [Fabric Apps Documentation](https://learn.microsoft.com/en-us/fabric/app-owned-data/build-apps)
- [XLSX Documentation](https://sheetjs.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Documentation](https://react.dev/)

---

**Built with ❤️ using Rayfin and Microsoft Fabric**
