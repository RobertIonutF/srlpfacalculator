# 💰 Calculator Taxe 2026 - PFA vs SRL

A modern, interactive tax calculator for Romanian freelancers and entrepreneurs to compare tax obligations between **PFA** (Persoană Fizică Autorizată) and **SRL** (Societate cu Răspundere Limitată) structures.

![Calculator Taxe 2026](https://img.shields.io/badge/Calculator-Taxe%202026-blue)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Zustand](https://img.shields.io/badge/Zustand-5.0-green)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Project Management](#project-management)
- [Tax Calculations](#tax-calculations)
- [Technology Stack](#technology-stack)
- [Expanding the Application](#expanding-the-application)
- [Contributing](#contributing)

## 🎯 Overview

This application helps Romanian freelancers and business owners make informed decisions about their business structure by calculating and comparing tax obligations for:

- **PFA (Persoană Fizică Autorizată)**: Individual authorized person
- **SRL (Societate cu Răspundere Limitată)**: Limited liability company

The calculator uses **2026 Romanian tax legislation** to provide accurate estimates of:
- Social security contributions (CAS, CASS)
- Income tax
- Corporate tax
- Dividend tax
- VAT obligations
- Operating costs

All calculations are based on current Romanian tax rates and thresholds as of 2026.

## ✨ Features

### 🧮 Tax Calculations

- **PFA Mode**:
  - CASS (health insurance) with tiered thresholds
  - CAS (pension) with three tiers (not required, 12 salaries, 24 salaries)
  - Income tax (10%)
  - Real-time effective tax rate calculation
  - Warnings when approaching CAS thresholds

- **SRL Mode**:
  - Microenterprise (1% on revenue) vs Standard (16% on profit)
  - Dividend extraction with 16% tax
  - Optional salary payments with full tax calculations
  - VAT registration status and obligations
  - Operating costs (accounting, bank fees, digital signature)
  - Retained profit calculations

### 💾 Project Management

- **Save Multiple Projects**: Save different scenarios with custom names
- **Auto-save**: All changes automatically persist to localStorage
- **Import/Export**: Backup and restore projects as JSON files
- **Project Switching**: Quickly switch between saved scenarios
- **Delete Projects**: Remove individual projects or clear all data

### 💱 Multi-Currency Support

- Display amounts in **RON**, **EUR**, or **USD**
- Real-time exchange rates from [Frankfurter API](https://www.frankfurter.app/)
- Automatic rate updates every 30 minutes
- Fallback rates if API is unavailable

### 📊 Detailed Breakdowns

- Annual gross income and expenses
- Tax-by-tax breakdown with explanations
- Effective tax rate percentage
- Net amount remaining after taxes
- Monthly breakdowns for better planning

## 🚀 Installation

### Prerequisites

- Node.js 18+ and npm
- Modern web browser

### Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd srlpfacalculator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:5173` (or the port shown in terminal)

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## 📖 Usage

### Basic Usage

1. **Select Mode**: Choose between PFA or SRL at the top
2. **Add Incomes**: Click "+ Adaugă venit" to add income sources
   - Enter description (e.g., "Web Project")
   - Enter amount in RON
   - Choose if it's one-time or recurring monthly
   - For recurring, specify number of months (1-12)
3. **Add Expenses**: Enter monthly deductible expenses (optional)
4. **View Results**: See tax breakdown and net amount in the results section

### PFA Mode

- **Income Sources**: Add all your project incomes
- **Monthly Expenses**: Enter deductible business expenses
- **Tax Breakdown**: See CASS, CAS, and income tax separately
- **Threshold Warnings**: Get notified when approaching CAS thresholds

### SRL Mode

1. **Taxation Type**: Choose Micro (1% on revenue) or Standard (16% on profit)
2. **Dividend Percentage**: Set how much profit to extract as dividends (0-100%)
3. **Salary Option**: Toggle if you want to pay yourself a salary
   - If enabled, enter monthly gross salary
4. **View Results**: See corporate tax, dividend tax, VAT, and net amounts

### Currency Display

- Click currency buttons (🇷🇴 RON, 🇪🇺 EUR, 🇺🇸 USD) to switch display
- All amounts update automatically with current exchange rates
- Exchange rates update every 30 minutes automatically

## 💾 Project Management

### Saving Projects

1. Enter a project name in the "Nume proiect..." field
2. Click "💾 Salvează" or press Enter
3. Project is saved with current date/time
4. If a project is already loaded, it will be updated instead of creating a new one

### Loading Projects

1. Use the dropdown "Încarcă proiect" to select a saved project
2. All calculator fields update automatically
3. The active project name is shown in the dropdown

### Exporting Projects

1. Click "📤 Export JSON"
2. A JSON file downloads with all saved projects
3. File name includes date: `tax-calculator-projects-YYYY-MM-DD.json`
4. Use this to backup your projects

### Importing Projects

1. Click "📥 Import JSON"
2. Select a previously exported JSON file
3. Projects are merged with existing ones (duplicates by ID are skipped)
4. Success/error message appears after import

### Deleting Projects

- **Delete Active Project**: Click "🗑️ Șterge proiect" (only visible when a project is loaded)
- **Clear All Projects**: Click "🗑️ Șterge toate"
- Both actions require confirmation to prevent accidental deletion

## 🧮 Tax Calculations

### PFA Tax Structure (2026)

#### CASS (Health Insurance)
- **Minimum**: 2,430 RON (if income < 24,300 RON)
- **10% of income**: If income between 24,300 - 291,600 RON
- **Maximum**: 29,160 RON (if income > 291,600 RON)

#### CAS (Pension)
- **Not Required**: If income ≤ 48,600 RON (12 minimum salaries)
- **Tier 1**: 12,150 RON (if income between 48,600 - 97,200 RON)
- **Tier 2**: 24,300 RON (if income > 97,200 RON)

#### Income Tax
- **10%** on taxable base (net income - CAS - CASS)

### SRL Tax Structure (2026)

#### Microenterprise
- **1% on revenue** (if revenue ≤ 500,000 RON)
- No profit-based calculations
- Simpler but limited to lower revenue

#### Standard Taxation
- **16% on profit** (revenue - expenses - operating costs - salary costs)
- More complex but no revenue limit

#### Dividends
- **16% tax** on dividend amount
- Only taxed when extracted from company

#### VAT
- **19% VAT** if revenue > 395,000 RON
- Must register for VAT above threshold
- VAT collected minus VAT on expenses

#### Operating Costs (Annual)
- Accounting: 3,000 - 9,000 RON (average 6,000 RON)
- Bank fees: 1,500 RON
- Digital signature: 300 RON
- **Total**: ~7,800 RON/year

## 🛠️ Technology Stack

- **React 19.2**: UI framework
- **TypeScript 5.9**: Type safety
- **Zustand 5.0**: State management with persistence
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling (via classes)
- **Frankfurter API**: Exchange rate data

### Project Structure

```
srlpfacalculator/
├── src/
│   ├── App.tsx              # Main calculator component
│   ├── store/
│   │   └── useTaxStore.ts   # Zustand store with persistence
│   ├── App.css
│   ├── index.css
│   └── main.tsx             # Entry point
├── public/
├── package.json
└── README.md
```

## 🚀 Expanding the Application

### Adding New Tax Years

1. **Update Constants** in `src/App.tsx`:
   ```typescript
   // Update minimum salary
   const MINIMUM_SALARY = 4050; // Update for new year
   
   // Update thresholds if changed
   const CASS_MIN_THRESHOLD = 6 * MINIMUM_SALARY;
   // ... etc
   ```

2. **Update UI Text**: Change "2026" references to new year

3. **Test Calculations**: Verify against official tax documentation

### Adding New Income Types

1. **Extend Income Interface** in `src/store/useTaxStore.ts`:
   ```typescript
   export interface Income {
     id: number;
     name: string;
     amount: number;
     isRecurring: boolean;
     months: number;
     // Add new fields here
     category?: string;
     taxDeductible?: boolean;
   }
   ```

2. **Update UI**: Add new input fields in the income form

3. **Update Calculations**: Modify calculation logic if needed

### Adding New Currencies

1. **Update CURRENCIES** in `src/App.tsx`:
   ```typescript
   const CURRENCIES = {
     RON: { symbol: 'RON', flag: '🇷🇴', name: 'Leu' },
     EUR: { symbol: '€', flag: '🇪🇺', name: 'Euro' },
     USD: { symbol: '$', flag: '🇺🇸', name: 'Dollar' },
     GBP: { symbol: '£', flag: '🇬🇧', name: 'Pound' }, // New
   };
   ```

2. **Update API Call**: Add new currency to Frankfurter API request
   ```typescript
   'https://api.frankfurter.app/latest?from=RON&to=EUR,USD,GBP'
   ```

3. **Update Types**: Add to `displayCurrency` type in store

### Adding New Calculation Features

1. **Create Calculation Function**: Add new calculation logic in `useMemo`
2. **Add UI Section**: Display results in appropriate section
3. **Update Store**: Add new fields to `ProjectData` if needed

### Adding Data Visualization

1. **Install Chart Library**:
   ```bash
   npm install recharts
   ```

2. **Create Chart Component**:
   ```typescript
   import { PieChart, Pie, Cell } from 'recharts';
   
   // Use in tax breakdown section
   ```

3. **Add to UI**: Integrate charts showing tax distribution

### Adding Export Formats

1. **PDF Export**:
   ```bash
   npm install jspdf html2canvas
   ```
   Create function to generate PDF from current view

2. **Excel Export**:
   ```bash
   npm install xlsx
   ```
   Export calculations to Excel format

### Adding Comparison Mode

1. **Extend Store**: Add `comparisonProjects` array
2. **Create Comparison View**: Side-by-side comparison component
3. **Add UI Toggle**: Switch between single and comparison mode

### Adding Tax Optimization Suggestions

1. **Create Optimization Engine**: Analyze current setup
2. **Suggest Improvements**: 
   - "Switch to SRL if revenue > X"
   - "Reduce dividend extraction to save Y"
   - "Consider salary to optimize taxes"
3. **Display Suggestions**: Add new UI section

### Adding Multi-User Support

1. **Add Authentication**: Integrate auth provider (Firebase, Auth0)
2. **Cloud Storage**: Replace localStorage with cloud database
3. **User Projects**: Store projects per user
4. **Sharing**: Add project sharing functionality

### Performance Optimizations

1. **Memoization**: Add `React.memo` to expensive components
2. **Code Splitting**: Lazy load project management features
3. **Virtualization**: For long project lists
4. **Service Worker**: Add offline support

### Testing

1. **Unit Tests**: Test calculation functions
   ```bash
   npm install --save-dev vitest @testing-library/react
   ```

2. **Integration Tests**: Test user flows
3. **E2E Tests**: Use Playwright or Cypress

### Accessibility Improvements

1. **ARIA Labels**: Add proper labels to all interactive elements
2. **Keyboard Navigation**: Ensure full keyboard support
3. **Screen Reader**: Test with screen readers
4. **Color Contrast**: Verify WCAG compliance

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**: Follow existing code style
4. **Test thoroughly**: Ensure calculations are correct
5. **Commit changes**: Use clear commit messages
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open Pull Request**: Describe changes and why

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add comments for complex calculations
- Keep components focused and small
- Use Zustand for state management

### Testing Tax Calculations

When modifying tax calculations:
1. Verify against official Romanian tax documentation
2. Test edge cases (minimum thresholds, maximum limits)
3. Compare with other tax calculators
4. Document any assumptions or approximations

## 📝 License

This project is private and proprietary.

## ⚠️ Disclaimer

This calculator provides **estimates** based on 2026 Romanian tax legislation. Tax laws change frequently, and individual circumstances may vary. Always consult with a qualified tax advisor or accountant before making financial decisions. The authors are not responsible for any tax-related consequences resulting from the use of this calculator.

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on the repository
- Contact the development team

---

**Made with ❤️ for Romanian freelancers and entrepreneurs**

*Last updated: January 2026*
