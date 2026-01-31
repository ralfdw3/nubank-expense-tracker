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
 * Categorize expense based on description using keyword matching
 */
function categorizeExpense(description) {
  if (!description) return 'Uncategorized';

  const descLower = description.toLowerCase();

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (descLower.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

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
        name: name,
        value: parsedValue,
        description: description,
        category: categorizeExpense(description),
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
      name: 'Pedágios NuTag',
      value: nutagTotal,
      description: `Pedágios NuTag (${nutagCount} transações)`,
      category: 'Transportation',
      source: 'Consolidated',
      type: nutagTotal < 0 ? 'Expense' : 'Income'
    });
  }

  console.log(`Total transactions processed: ${allExpenses.length}`);
  return allExpenses;
}

/**
 * Export expenses to CSV
 */
function exportToCSV(expenses) {
  // Calculate totals
  const categoryTotals = {};
  let totalExpenses = 0;
  let totalIncome = 0;

  expenses.forEach(exp => {
    if (!categoryTotals[exp.category]) {
      categoryTotals[exp.category] = 0;
    }
    categoryTotals[exp.category] += exp.value;

    if (exp.value < 0) {
      totalExpenses += exp.value;
    } else {
      totalIncome += exp.value;
    }
  });

  const netTotal = totalExpenses + totalIncome;

  // Prepare main data
  const mainData = expenses.map(exp => ({
    Name: exp.name,
    Value: exp.value,
    Category: exp.category,
    Type: exp.type,
    Source: exp.source
  }));

  // Add empty rows and category summary
  const summaryData = [
    { Name: '', Value: '', Category: '', Type: '', Source: '' },
    { Name: '', Value: '', Category: '', Type: '', Source: '' },
    { Name: '=== CATEGORY SUMMARY ===', Value: '', Category: '', Type: '', Source: '' },
    { Name: 'Category', Value: 'Total', Category: '', Type: '', Source: '' }
  ];

  // Add category totals sorted by amount (most negative first)
  Object.entries(categoryTotals)
    .sort(([, a], [, b]) => a - b)
    .forEach(([cat, total]) => {
      summaryData.push({
        Name: cat,
        Value: total.toFixed(2),
        Category: '',
        Type: '',
        Source: ''
      });
    });

  // Add financial summary
  summaryData.push(
    { Name: '', Value: '', Category: '', Type: '', Source: '' },
    { Name: '=== FINANCIAL SUMMARY ===', Value: '', Category: '', Type: '', Source: '' },
    { Name: 'Total Expenses', Value: totalExpenses.toFixed(2), Category: '', Type: '', Source: '' },
    { Name: 'Total Income', Value: totalIncome.toFixed(2), Category: '', Type: '', Source: '' },
    { Name: 'Net Balance', Value: netTotal.toFixed(2), Category: '', Type: '', Source: '' }
  );

  // Combine all data
  const allData = [...mainData, ...summaryData];

  const csvOutput = stringify(allData, {
    header: true,
    columns: ['Name', 'Value', 'Category', 'Type', 'Source']
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
