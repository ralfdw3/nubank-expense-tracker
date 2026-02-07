const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const CONFIG = {
  csvFiles: [
    { name: 'credit.csv', type: 'credit' },  // All values are expenses (positive becomes negative)
    { name: 'debit.csv', type: 'debit' }     // Values keep their sign (negative = expense, positive = income)
  ],
  outputFile: 'categorized_expenses.csv'
};

// Load categories configuration
const categories = require('./categories.json');

/**
 * Parse CSV file and return array of records
 */
function parseCSV(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  return records;
}

/**
 * Categorize expense based on description and value using keyword matching
 */
function categorizeExpense(description, value) {
  if (!description) return 'Uncategorized';

  const descLower = description.toLowerCase();

  // Check each category's keywords first (normal flow)
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (descLower.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // Special rule: Pix transfers based on income/expense (only if not categorized by keywords)
  const isPixTransfer = descLower.includes('pix') || descLower.includes('transferência') || descLower.includes('transferencia');

  if (isPixTransfer) {
    // If it's income (positive value), categorize as Ride Sharing Income (carona BlablaCar)
    if (value > 0) {
      return 'Ride Sharing Income';
    }
    // If it's expense (negative value), categorize as Personal Transfers
    if (value < 0) {
      return 'Personal Transfers';
    }
  }

  // If no keyword matched and not a Pix transfer
  return 'Uncategorized';
}

/**
 * Process all CSV files and categorize expenses
 */
function processExpenses() {
  const allExpenses = [];
  let nutagTotal = 0;
  let nutagCount = 0;

  for (const csvConfig of CONFIG.csvFiles) {
    const filePath = path.join(__dirname, csvConfig.name);

    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: File not found - ${csvConfig.name}`);
      continue;
    }

    console.log(`Processing ${csvConfig.name} (${csvConfig.type})...`);
    const records = parseCSV(filePath);

    // Normalize and categorize each record
    records.forEach(record => {
      // Detect column names (handle variations)
      // For date
      let date = record.date || record.Date || record.data || record.Data || '';

      // Normalize date format to DD/MM/YYYY
      if (date) {
        // Check if date is in YYYY-MM-DD format (credit.csv)
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = date.split('-');
          date = `${day}/${month}/${year}`;
        }
        // If already in DD/MM/YYYY format (debit.csv), keep it
      }

      // For name/title
      const name = record.name || record.Name || record.title || record.Title ||
                   record.description || record.Description || record.Descrição || '';

      // For value/amount
      const value = record.value || record.Value || record.amount || record.Amount ||
                    record.Valor || '0';

      // For description (use Descrição from debit, title from credit)
      const description = record.Descrição || record.description || record.Description ||
                          record.title || record.Title || record.name || record.Name || '';

      // Skip "Pagamento de fatura" entries to avoid double counting credit card expenses
      if (description.toLowerCase().includes('pagamento de fatura')) {
        console.log(`  Skipping duplicate: ${description}`);
        return;
      }

      // Parse the value (handle comma as decimal separator)
      let parsedValue = parseFloat(value.toString().replace(',', '.').replace(/[^0-9.-]/g, ''));

      // Apply sign correction based on file type
      if (csvConfig.type === 'credit') {
        // Credit card expenses: all positive values should become negative (you spent money)
        parsedValue = Math.abs(parsedValue) * -1;
      }
      // For debit: keep the original sign (negative = expense, positive = income)

      // Group NuTag transactions (toll charges)
      if (description.toLowerCase().includes('nutag')) {
        nutagTotal += parsedValue;
        nutagCount++;
        console.log(`  Grouping NuTag toll: ${parsedValue.toFixed(2)}`);
        return;
      }

      const expense = {
        date: date,
        name: name,
        value: parsedValue,
        description: description,
        category: categorizeExpense(description, parsedValue),
        source: csvConfig.name,
        type: parsedValue < 0 ? 'Expense' : 'Income'
      };

      allExpenses.push(expense);
    });
  }

  // Add consolidated NuTag entry if there are any toll charges
  if (nutagCount > 0) {
    console.log(`  Consolidated ${nutagCount} NuTag transactions into one entry: ${nutagTotal.toFixed(2)}`);
    allExpenses.push({
      date: '',
      name: 'Pedágios NuTag',
      value: nutagTotal,
      description: `Pedágios NuTag (${nutagCount} transações)`,
      category: 'Transportation',
      source: 'Consolidated',
      type: nutagTotal < 0 ? 'Expense' : 'Income'
    });
  }

  // Sort expenses by date (oldest first)
  allExpenses.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;

    // Parse DD/MM/YYYY format to Date object
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('/');
      return new Date(year, month - 1, day);
    };

    return parseDate(a.date) - parseDate(b.date);
  });

  console.log(`Total transactions processed: ${allExpenses.length}`);
  return allExpenses;
}

/**
 * Export expenses to CSV
 */
function exportToCSV(expenses) {
  // Get all categories from categories.json (includes empty ones) plus any that appear in data
  const categoriesFromConfig = Object.keys(categories);
  const categoriesFromData = expenses.map(exp => exp.category);
  const allCategories = [...new Set([...categoriesFromConfig, ...categoriesFromData])].sort();

  // Prepare main data
  const mainData = expenses.map(exp => ({
    Date: exp.date,
    Name: exp.name,
    Value: exp.value,
    Category: exp.category,
    Type: exp.type,
    Source: exp.source
  }));

  const dataRowCount = mainData.length + 2; // +2 for header row (1) and starting from row 2

  // Add empty rows and category summary
  const summaryData = [
    { Date: '', Name: '', Value: '', Category: '', Type: '', Source: '' },
    { Date: '', Name: '', Value: '', Category: '', Type: '', Source: '' },
    { Date: '', Name: 'CATEGORY SUMMARY', Value: 'Total', Category: '', Type: '', Source: '' }
  ];

  // Add category totals with SUMIF formulas
  allCategories.forEach(cat => {
    // Formula: =SUMIF(D2:D[lastRow], "CategoryName", C2:C[lastRow])
    // Where D is Category column and C is Value column
    const formula = `=SUMIF(D2:D${dataRowCount},"${cat}",C2:C${dataRowCount})`;
    summaryData.push({
      Date: '',
      Name: cat,
      Value: formula,
      Category: '',
      Type: '',
      Source: ''
    });
  });

  // Add financial summary with formulas
  // Calculate exact row numbers for the financial summary section
  // Current position: dataRowCount + summaryData.length (which includes empty rows, category summary header, all categories)
  // +1 for empty row before FINANCIAL SUMMARY
  // +2 for empty row + "FINANCIAL SUMMARY" header
  // +3 for "Total Expenses" row
  // +4 for "Total Income" row
  const financialSummaryStartRow = dataRowCount + summaryData.length + 1;
  const expensesRow = financialSummaryStartRow + 2;
  const incomeRow = expensesRow + 1;

  summaryData.push(
    { Date: '', Name: '', Value: '', Category: '', Type: '', Source: '' },
    { Date: '', Name: 'FINANCIAL SUMMARY', Value: '', Category: '', Type: '', Source: '' },
    { Date: '', Name: 'Total Expenses', Value: `=SUMIF(C2:C${dataRowCount},"<0",C2:C${dataRowCount})`, Category: '', Type: '', Source: '' },
    { Date: '', Name: 'Total Income', Value: `=SUMIF(C2:C${dataRowCount},">0",C2:C${dataRowCount})`, Category: '', Type: '', Source: '' },
    { Date: '', Name: 'Net Balance', Value: `=SUM(C${incomeRow}+C${expensesRow})`, Category: '', Type: '', Source: '' }
  );

  // Combine all data
  const allData = [...mainData, ...summaryData];

  const csvOutput = stringify(allData, {
    header: true,
    columns: ['Date', 'Name', 'Value', 'Category', 'Type', 'Source']
  });

  const outputPath = path.join(__dirname, CONFIG.outputFile);
  fs.writeFileSync(outputPath, csvOutput);

  console.log(`\nExport completed: ${CONFIG.outputFile}`);
  console.log(`Location: ${outputPath}`);
}

/**
 * Display category summary
 */
function displaySummary(expenses) {
  const categoryTotals = {};
  const categoryCount = {};
  let totalExpenses = 0;
  let totalIncome = 0;

  expenses.forEach(exp => {
    if (!categoryTotals[exp.category]) {
      categoryTotals[exp.category] = 0;
      categoryCount[exp.category] = 0;
    }
    categoryTotals[exp.category] += exp.value;
    categoryCount[exp.category]++;

    // Track total expenses vs income
    if (exp.value < 0) {
      totalExpenses += exp.value;
    } else {
      totalIncome += exp.value;
    }
  });

  console.log('\n=== Category Summary ===');
  Object.entries(categoryTotals)
    .sort(([, a], [, b]) => a - b) // Sort by total (most negative first = biggest expenses)
    .forEach(([cat, total]) => {
      const sign = total < 0 ? '-' : '+';
      console.log(`${cat}: ${categoryCount[cat]} transactions, Total: ${sign}$${Math.abs(total).toFixed(2)}`);
    });

  const netTotal = totalExpenses + totalIncome;
  console.log(`\n--- Financial Summary ---`);
  console.log(`Total Expenses: -$${Math.abs(totalExpenses).toFixed(2)}`);
  console.log(`Total Income: +$${totalIncome.toFixed(2)}`);
  console.log(`Net Balance: ${netTotal < 0 ? '-' : '+'}$${Math.abs(netTotal).toFixed(2)}`);
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('=== Credit Card Expense Categorizer ===\n');

    // Process expenses
    const expenses = processExpenses();

    if (expenses.length === 0) {
      console.log('No transactions found. Please check your CSV files.');
      return;
    }

    // Display summary
    displaySummary(expenses);

    // Export to CSV
    exportToCSV(expenses);

    console.log('\nDone! You can now open the CSV file in any spreadsheet application.');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
