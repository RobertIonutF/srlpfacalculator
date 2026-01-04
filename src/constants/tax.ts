// ============ 2026 TAX CONSTANTS ============

// PFA Constants (all in RON) - 2026 verified values
export const MINIMUM_SALARY = 4050;
export const CASS_MIN_THRESHOLD = 6 * MINIMUM_SALARY;   // 24,300 RON
export const CASS_MAX_THRESHOLD = 60 * MINIMUM_SALARY;  // 243,000 RON
export const CAS_THRESHOLD_LOW = 12 * MINIMUM_SALARY;   // 48,600 RON
export const CAS_THRESHOLD_HIGH = 24 * MINIMUM_SALARY;  // 97,200 RON
export const CASS_MINIMUM = CASS_MIN_THRESHOLD * 0.10;  // 2,430 RON
export const CASS_MAXIMUM = CASS_MAX_THRESHOLD * 0.10;  // 24,300 RON
export const CAS_TIER1 = CAS_THRESHOLD_LOW * 0.25;      // 12,150 RON
export const CAS_TIER2 = CAS_THRESHOLD_HIGH * 0.25;     // 24,300 RON
export const INCOME_TAX_RATE = 0.10;

// SRL Constants
export const MICRO_TAX_RATE = 0.01;
export const STANDARD_TAX_RATE = 0.16;
export const DIVIDEND_TAX_RATE = 0.16;
export const VAT_THRESHOLD = 395000; // ~€88,500
export const VAT_RATE = 0.19;
export const MICRO_REVENUE_LIMIT = 500000;

// Operating costs (annual, in RON)
export const SRL_ACCOUNTING_LOW = 3000;
export const SRL_ACCOUNTING_HIGH = 9000;
export const SRL_BANK_FEES = 1500;
export const SRL_DIGITAL_SIGNATURE = 300;

// Salary contribution rates
export const EMPLOYER_CAM_RATE = 0.0225;
export const EMPLOYEE_CAS_RATE = 0.25;
export const EMPLOYEE_CASS_RATE = 0.10;
export const SALARY_INCOME_TAX_RATE = 0.10;

// Currency configuration
export const CURRENCIES = {
  RON: { symbol: 'RON', flag: '🇷🇴', name: 'Leu' },
  EUR: { symbol: '€', flag: '🇪🇺', name: 'Euro' },
  USD: { symbol: '$', flag: '🇺🇸', name: 'Dollar' }
} as const;

export const FALLBACK_RATES = { RON: 1, EUR: 0.2, USD: 0.22 };

export type CurrencyCode = keyof typeof CURRENCIES;

