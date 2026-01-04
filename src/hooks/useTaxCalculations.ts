import { useMemo } from 'react';
import { Income, PFAOptions, SRLOptions } from '../store/useTaxStore';
import {
  CASS_MIN_THRESHOLD, CASS_MAX_THRESHOLD, CASS_MINIMUM, CASS_MAXIMUM,
  CAS_THRESHOLD_LOW, CAS_THRESHOLD_HIGH, CAS_TIER1, CAS_TIER2,
  INCOME_TAX_RATE, MICRO_TAX_RATE, STANDARD_TAX_RATE, DIVIDEND_TAX_RATE,
  VAT_RATE, MICRO_REVENUE_LIMIT, SRL_ACCOUNTING_LOW, SRL_ACCOUNTING_HIGH,
  SRL_BANK_FEES, SRL_DIGITAL_SIGNATURE, EMPLOYER_CAM_RATE,
  EMPLOYEE_CAS_RATE, EMPLOYEE_CASS_RATE, SALARY_INCOME_TAX_RATE
} from '../constants/tax';

export interface PFACalculations {
  annualGross: number;
  annualExpenses: number;
  netIncome: number;
  cas: number;
  casStatus: 'not_required' | 'tier1' | 'tier2';
  cass: number;
  taxableBase: number;
  incomeTax: number;
  totalTaxes: number;
  canSpend: number;
  effectiveRate: number;
}

export interface SRLCalculations {
  annualRevenue: number;
  annualExpenses: number;
  operatingCosts: number;
  isVATRegistered: boolean;
  vatToPay: number;
  vatCollected: number;
  vatOnExpenses: number;
  canBeMicro: boolean;
  isMicro: boolean;
  salaryCostToCompany: number;
  salaryNetToOwner: number;
  salaryEmployerCAM: number;
  salaryEmployeeCAS: number;
  salaryEmployeeCASS: number;
  salaryIncomeTax: number;
  grossProfit: number;
  corporateTax: number;
  netProfit: number;
  dividendAmount: number;
  dividendTax: number;
  dividendNet: number;
  retainedProfit: number;
  totalToOwner: number;
  totalGovTaxes: number;
  effectiveRate: number;
}

function calculateAnnualIncome(incomes: Income[]): number {
  return incomes.reduce((sum, inc) => 
    sum + (inc.isRecurring ? inc.amount * (inc.months || 12) : inc.amount), 0);
}

export function usePFACalculations(
  incomes: Income[],
  monthlyExpenses: number,
  pfaOptions: PFAOptions
): PFACalculations {
  return useMemo(() => {
    const annualGross = calculateAnnualIncome(incomes);
    const annualExpenses = monthlyExpenses * 12;
    const netIncome = Math.max(0, annualGross - annualExpenses);

    // CASS calculation with employment exemption
    let cass: number;
    if (pfaOptions.isEmployed && netIncome < CASS_MIN_THRESHOLD) {
      cass = 0;
    } else if (pfaOptions.isEmployed) {
      cass = Math.min(netIncome * 0.10, CASS_MAXIMUM);
    } else {
      if (netIncome < CASS_MIN_THRESHOLD) cass = CASS_MINIMUM;
      else if (netIncome > CASS_MAX_THRESHOLD) cass = CASS_MAXIMUM;
      else cass = netIncome * 0.10;
    }

    // CAS calculation
    let cas: number;
    let casStatus: 'not_required' | 'tier1' | 'tier2';
    if (netIncome <= CAS_THRESHOLD_LOW) {
      cas = 0;
      casStatus = 'not_required';
    } else if (netIncome <= CAS_THRESHOLD_HIGH) {
      cas = CAS_TIER1;
      casStatus = 'tier1';
    } else {
      cas = CAS_TIER2;
      casStatus = 'tier2';
    }

    const taxableBase = Math.max(0, netIncome - cas - cass);
    const incomeTax = taxableBase * INCOME_TAX_RATE;
    const totalTaxes = cas + cass + incomeTax;
    const canSpend = netIncome - totalTaxes;
    const effectiveRate = annualGross > 0 ? (totalTaxes / annualGross) * 100 : 0;

    return {
      annualGross, annualExpenses, netIncome, cas, casStatus, cass,
      taxableBase, incomeTax, totalTaxes, canSpend, effectiveRate
    };
  }, [incomes, monthlyExpenses, pfaOptions]);
}

export function useSRLCalculations(
  incomes: Income[],
  monthlyExpenses: number,
  srlOptions: SRLOptions & { vatStatus: string; euRevenuePercent: number }
): SRLCalculations {
  return useMemo(() => {
    const annualRevenue = calculateAnnualIncome(incomes);
    const annualExpenses = monthlyExpenses * 12;
    const accountingCost = (SRL_ACCOUNTING_LOW + SRL_ACCOUNTING_HIGH) / 2;
    const operatingCosts = accountingCost + SRL_BANK_FEES + SRL_DIGITAL_SIGNATURE;

    // VAT calculations
    const isVATRegistered = srlOptions.vatStatus !== 'not_registered';
    const domesticRevenue = annualRevenue * (1 - srlOptions.euRevenuePercent / 100);
    const vatCollected = isVATRegistered ? domesticRevenue * VAT_RATE : 0;
    const vatOnExpenses = isVATRegistered ? annualExpenses * VAT_RATE : 0;
    const vatToPay = Math.max(0, vatCollected - vatOnExpenses);

    // Company type
    const canBeMicro = annualRevenue <= MICRO_REVENUE_LIMIT;
    const isMicro = srlOptions.isMicro && canBeMicro;

    // Salary calculations
    let salaryCostToCompany = 0, salaryNetToOwner = 0;
    let salaryEmployerCAM = 0, salaryEmployeeCAS = 0, salaryEmployeeCASS = 0, salaryIncomeTax = 0;
    
    if (srlOptions.paySalary) {
      const grossSalary = srlOptions.monthlySalary * 12;
      salaryEmployerCAM = grossSalary * EMPLOYER_CAM_RATE;
      salaryEmployeeCAS = grossSalary * EMPLOYEE_CAS_RATE;
      salaryEmployeeCASS = grossSalary * EMPLOYEE_CASS_RATE;
      const taxableNetSalary = grossSalary - salaryEmployeeCAS - salaryEmployeeCASS;
      salaryIncomeTax = taxableNetSalary * SALARY_INCOME_TAX_RATE;
      salaryCostToCompany = grossSalary + salaryEmployerCAM;
      salaryNetToOwner = grossSalary - salaryEmployeeCAS - salaryEmployeeCASS - salaryIncomeTax;
    }

    // Profit calculations
    const grossProfit = Math.max(0, annualRevenue - annualExpenses - salaryCostToCompany - operatingCosts);
    const corporateTax = isMicro ? annualRevenue * MICRO_TAX_RATE : grossProfit * STANDARD_TAX_RATE;
    const netProfit = Math.max(0, grossProfit - corporateTax);
    
    // Dividend calculations
    const dividendAmount = netProfit * (srlOptions.dividendPercent / 100);
    const dividendTax = dividendAmount * DIVIDEND_TAX_RATE;
    const dividendNet = dividendAmount - dividendTax;
    const retainedProfit = netProfit - dividendAmount;
    const totalToOwner = salaryNetToOwner + dividendNet;

    // Total taxes
    const salaryTaxesTotal = srlOptions.paySalary 
      ? salaryEmployerCAM + salaryEmployeeCAS + salaryEmployeeCASS + salaryIncomeTax 
      : 0;
    const totalGovTaxes = corporateTax + dividendTax + salaryTaxesTotal;
    const effectiveRate = annualRevenue > 0 ? (totalGovTaxes / annualRevenue) * 100 : 0;

    return {
      annualRevenue, annualExpenses, operatingCosts, isVATRegistered, vatToPay, vatCollected, vatOnExpenses,
      canBeMicro, isMicro, salaryCostToCompany, salaryNetToOwner, salaryEmployerCAM, salaryEmployeeCAS,
      salaryEmployeeCASS, salaryIncomeTax, grossProfit, corporateTax, netProfit, dividendAmount, dividendTax,
      dividendNet, retainedProfit, totalToOwner, totalGovTaxes, effectiveRate
    };
  }, [incomes, monthlyExpenses, srlOptions]);
}

