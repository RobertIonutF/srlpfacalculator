import{ useState, useMemo, useEffect } from 'react';
import { useTaxStore } from './store/useTaxStore';

// ============ 2026 TAX CONSTANTS ============

// PFA Constants (all in RON) - 2026 verified values
const MINIMUM_SALARY = 4050;
const CASS_MIN_THRESHOLD = 6 * MINIMUM_SALARY;   // 24,300 RON
const CASS_MAX_THRESHOLD = 60 * MINIMUM_SALARY;  // 243,000 RON (corrected from 72x)
const CAS_THRESHOLD_LOW = 12 * MINIMUM_SALARY;   // 48,600 RON
const CAS_THRESHOLD_HIGH = 24 * MINIMUM_SALARY;  // 97,200 RON
const CASS_MINIMUM = CASS_MIN_THRESHOLD * 0.10;  // 2,430 RON
const CASS_MAXIMUM = CASS_MAX_THRESHOLD * 0.10;  // 24,300 RON (corrected)
const CAS_TIER1 = CAS_THRESHOLD_LOW * 0.25;      // 12,150 RON
const CAS_TIER2 = CAS_THRESHOLD_HIGH * 0.25;     // 24,300 RON
const INCOME_TAX_RATE = 0.10;

// SRL Constants
const MICRO_TAX_RATE = 0.01;        // 1% on revenue
const STANDARD_TAX_RATE = 0.16;     // 16% on profit
const DIVIDEND_TAX_RATE = 0.16;     // 16% on dividends
const VAT_THRESHOLD = 395000;       // RON (~€81,000)
const VAT_RATE = 0.19;              // 19%
const MICRO_REVENUE_LIMIT = 500000; // RON (~€100,000)

// Operating costs (annual, in RON)
const SRL_ACCOUNTING_LOW = 3000;    // €600/year
const SRL_ACCOUNTING_HIGH = 9000;   // €1,800/year
const SRL_BANK_FEES = 1500;         // €300/year
const SRL_DIGITAL_SIGNATURE = 300;  // €60/year

const CURRENCIES = {
  RON: { symbol: 'RON', flag: '🇷🇴', name: 'Leu' },
  EUR: { symbol: '€', flag: '🇪🇺', name: 'Euro' },
  USD: { symbol: '$', flag: '🇺🇸', name: 'Dollar' }
};

const FALLBACK_RATES = { RON: 1, EUR: 0.2, USD: 0.22 };

export default function TaxCalculator() {
  // Zustand store
  const {
    currentProject,
    projects,
    activeProjectId,
    setMode,
    setIncomes,
    setMonthlyExpenses,
    setDisplayCurrency,
    setSrlOptions,
    setPfaOptions,
    saveProject,
    loadProject,
    deleteProject,
    clearAllProjects,
    exportProjects,
    importProjects,
  } = useTaxStore();
  
  const { 
    mode, 
    incomes, 
    monthlyExpenses, 
    displayCurrency, 
    srlOptions: rawSrlOptions, 
    pfaOptions = { isEmployed: false, employmentGrossSalary: 0 } 
  } = currentProject;
  
  // Add defaults for new SRL options (for backwards compatibility with old saved projects)
  const srlOptions = {
    ...rawSrlOptions,
    vatStatus: rawSrlOptions.vatStatus || 'not_registered',
    euRevenuePercent: rawSrlOptions.euRevenuePercent ?? 0,
  } as typeof rawSrlOptions & { vatStatus: 'not_registered' | 'registered' | 'voluntary'; euRevenuePercent: number };
  
  // Project management state
  const [projectName, setProjectName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Exchange rates (kept as component state - not persisted)
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch real-time exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      setRatesLoading(true);
      try {
        const response = await fetch(
          'https://api.frankfurter.app/latest?from=RON&to=EUR,USD'
        );
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        setRates({ RON: 1, EUR: data.rates.EUR, USD: data.rates.USD });
        setLastUpdated(new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) || null);
        setRatesError(null);
      } catch (err) {
        setRatesError('Rate aproximative');
        setRates(FALLBACK_RATES);
      } finally {
        setRatesLoading(false);
      }
    };
    fetchRates();
    const interval = setInterval(fetchRates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toDisplay = (ronAmount: number) => ronAmount * rates[displayCurrency as keyof typeof rates];

  const formatAmount = (ronAmount: number) => {
    const converted = toDisplay(ronAmount);
    const curr = CURRENCIES[displayCurrency as keyof typeof CURRENCIES];
    if (displayCurrency === 'RON') {
      return `${new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.round(converted))} RON`;
    }
    return `${curr.symbol}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(converted))}`;
  };

  const formatRON = (amount: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.round(amount));

  const addIncome = () => {
    setIncomes([...incomes, { id: Date.now(), name: '', amount: 0, isRecurring: false, months: 1 }]);
  };

  const updateIncome = (id: number, field: string, value: any) => {
    // If updating amount, convert from display currency to RON for storage
    if (field === 'amount' && displayCurrency !== 'RON') {
      const ronValue = value / rates[displayCurrency as keyof typeof rates];
      setIncomes(incomes.map(inc => inc.id === id ? { ...inc, [field]: ronValue } : inc));
    } else {
      setIncomes(incomes.map(inc => inc.id === id ? { ...inc, [field]: value } : inc));
    }
  };

  const removeIncome = (id: number) => {
    setIncomes(incomes.filter(inc => inc.id !== id));
  };

  // ============ PROJECT MANAGEMENT HANDLERS ============
  
  const handleSaveProject = () => {
    if (!projectName.trim()) {
      alert('Te rog introdu un nume pentru proiect');
      return;
    }
    saveProject(projectName.trim());
    setProjectName('');
  };

  const handleLoadProject = (id: string) => {
    if (id) {
      loadProject(id);
    }
  };

  const handleDeleteProject = () => {
    if (activeProjectId) {
      deleteProject(activeProjectId);
      setShowDeleteConfirm(false);
    }
  };

  const handleClearAll = () => {
    clearAllProjects();
    setShowClearConfirm(false);
  };

  const handleExport = () => {
    const json = exportProjects();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-calculator-projects-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importProjects(content);
      if (success) {
        alert('Proiecte importate cu succes!');
      } else {
        alert('Eroare la importul proiectelor. Verifică formatul fișierului.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // ============ PFA CALCULATIONS ============
  const pfaCalculations = useMemo(() => {
    const annualGross = incomes.reduce((sum, inc) => {
      return sum + (inc.isRecurring ? inc.amount * (inc.months || 12) : inc.amount);
    }, 0);
    const annualExpenses = monthlyExpenses * 12;
    const netIncome = Math.max(0, annualGross - annualExpenses);

    // CASS - adjusted for employed people
    let cass;
    if (pfaOptions.isEmployed && netIncome < CASS_MIN_THRESHOLD) {
      // If employed AND PFA net income < 6x min salary, no additional CASS (already covered by employment)
      cass = 0;
    } else if (pfaOptions.isEmployed) {
      // Employed but PFA income exceeds threshold - pay CASS on PFA income (no minimum)
      cass = Math.min(netIncome * 0.10, CASS_MAXIMUM);
    } else {
      // Not employed - standard logic with minimums
      if (netIncome < CASS_MIN_THRESHOLD) cass = CASS_MINIMUM;
      else if (netIncome > CASS_MAX_THRESHOLD) cass = CASS_MAXIMUM;
      else cass = netIncome * 0.10;
    }

    // CAS
    let cas, casStatus;
    if (netIncome <= CAS_THRESHOLD_LOW) { cas = 0; casStatus = 'not_required'; }
    else if (netIncome <= CAS_THRESHOLD_HIGH) { cas = CAS_TIER1; casStatus = 'tier1'; }
    else { cas = CAS_TIER2; casStatus = 'tier2'; }

    // Income tax
    const taxableBase = Math.max(0, netIncome - cas - cass);
    const incomeTax = taxableBase * INCOME_TAX_RATE;

    const totalTaxes = cas + cass + incomeTax;
    const canSpend = netIncome - totalTaxes;
    const effectiveRate = annualGross > 0 ? (totalTaxes / annualGross) * 100 : 0;

    const distanceToCAS = CAS_THRESHOLD_LOW - netIncome;
    const nearCASThreshold = distanceToCAS > 0 && distanceToCAS < 10000;

    return {
      annualGross, annualExpenses, netIncome,
      cas, casStatus, cass, taxableBase, incomeTax,
      totalTaxes, canSpend, effectiveRate,
      distanceToCAS, nearCASThreshold
    };
  }, [incomes, monthlyExpenses]);

  // ============ SRL CALCULATIONS ============
  const srlCalculations = useMemo(() => {
    const annualRevenue = incomes.reduce((sum, inc) => {
      return sum + (inc.isRecurring ? inc.amount * (inc.months || 12) : inc.amount);
    }, 0);
    const annualExpenses = monthlyExpenses * 12;

    // Operating costs
    const accountingCost = (SRL_ACCOUNTING_LOW + SRL_ACCOUNTING_HIGH) / 2;
    const operatingCosts = accountingCost + SRL_BANK_FEES + SRL_DIGITAL_SIGNATURE;

    // VAT status - now based on user selection
    const isVATRegistered = srlOptions.vatStatus !== 'not_registered';
    const domesticRevenue = annualRevenue * (1 - srlOptions.euRevenuePercent / 100);
    const vatCollected = isVATRegistered ? domesticRevenue * VAT_RATE : 0;
    const vatOnExpenses = isVATRegistered ? annualExpenses * VAT_RATE : 0;
    const vatToPay = Math.max(0, vatCollected - vatOnExpenses);

    // Determine if micro or standard
    const canBeMicro = annualRevenue <= MICRO_REVENUE_LIMIT;
    const isMicro = srlOptions.isMicro && canBeMicro;

    // Salary costs (if applicable) - FIXED 2026 rates
    let salaryCostToCompany = 0;
    let salaryNetToOwner = 0;
    let salaryEmployerCAM = 0;
    let salaryEmployeeCAS = 0;
    let salaryEmployeeCASS = 0;
    let salaryIncomeTax = 0;
    if (srlOptions.paySalary) {
      const grossSalary = srlOptions.monthlySalary * 12;
      // Employer pays only CAM (2.25%)
      salaryEmployerCAM = grossSalary * 0.0225;
      // Employee pays CAS (25%) + CASS (10%)
      salaryEmployeeCAS = grossSalary * 0.25;
      salaryEmployeeCASS = grossSalary * 0.10;
      const taxableNetSalary = grossSalary - salaryEmployeeCAS - salaryEmployeeCASS;
      salaryIncomeTax = taxableNetSalary * 0.10;
      
      salaryCostToCompany = grossSalary + salaryEmployerCAM;
      salaryNetToOwner = grossSalary - salaryEmployeeCAS - salaryEmployeeCASS - salaryIncomeTax;
    }

    // Gross profit
    const grossProfit = Math.max(0, annualRevenue - annualExpenses - salaryCostToCompany - operatingCosts);

    // Corporate tax
    let corporateTax;
    if (isMicro) {
      corporateTax = annualRevenue * MICRO_TAX_RATE;
    } else {
      corporateTax = grossProfit * STANDARD_TAX_RATE;
    }

    // Net profit
    const netProfit = Math.max(0, grossProfit - corporateTax);

    // Dividends
    const dividendAmount = netProfit * (srlOptions.dividendPercent / 100);
    const dividendTax = dividendAmount * DIVIDEND_TAX_RATE;
    const dividendNet = dividendAmount - dividendTax;

    // Retained
    const retainedProfit = netProfit - dividendAmount;

    // Total to owner
    const totalToOwner = salaryNetToOwner + dividendNet;

    // Total government taxes (EXCLUDING VAT - it's a pass-through tax)
    const salaryTaxesTotal = srlOptions.paySalary 
      ? salaryEmployerCAM + salaryEmployeeCAS + salaryEmployeeCASS + salaryIncomeTax 
      : 0;
    const totalGovTaxes = corporateTax + dividendTax + salaryTaxesTotal;

    const effectiveRate = annualRevenue > 0 ? (totalGovTaxes / annualRevenue) * 100 : 0;

    return {
      annualRevenue, annualExpenses, operatingCosts,
      isVATRegistered, vatToPay, vatCollected, vatOnExpenses,
      canBeMicro, isMicro,
      salaryCostToCompany, salaryNetToOwner,
      salaryEmployerCAM, salaryEmployeeCAS, salaryEmployeeCASS, salaryIncomeTax,
      grossProfit, corporateTax, netProfit,
      dividendAmount, dividendTax, dividendNet,
      retainedProfit, totalToOwner,
      totalGovTaxes, effectiveRate
    };
  }, [incomes, monthlyExpenses, srlOptions]);

  const calc = mode === 'pfa' ? pfaCalculations : srlCalculations;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Calculator Taxe 2026</h1>
          <p className="text-slate-400">Compară PFA vs SRL - vezi cât păstrezi din fiecare venit</p>
        </div>

        {/* Project Management */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 mb-6 border border-slate-700">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <span>💾</span>
            <span>Proiecte salvate</span>
          </h3>
          
          <div className="space-y-3">
            {/* Load Project */}
            {projects.length > 0 && (
              <div>
                <label className="block text-slate-400 text-sm mb-1">Încarcă proiect</label>
                <select
                  value={activeProjectId || ''}
                  onChange={(e) => handleLoadProject(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Selectează un proiect --</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({new Date(project.updatedAt).toLocaleDateString('ro-RO')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Save Project */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nume proiect..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveProject()}
                className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSaveProject}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                💾 Salvează
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
              {activeProjectId && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg text-sm font-medium transition-colors"
                >
                  🗑️ Șterge proiect
                </button>
              )}
              
              {projects.length > 0 && (
                <>
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 rounded-lg text-sm font-medium transition-colors"
                  >
                    📤 Export JSON
                  </button>
                  
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 rounded-lg text-sm font-medium transition-colors"
                  >
                    🗑️ Șterge toate
                  </button>
                </>
              )}
              
              <label className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                📥 Import JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-2">Confirmare ștergere</h3>
              <p className="text-slate-400 mb-6">
                Ești sigur că vrei să ștergi acest proiect? Această acțiune nu poate fi anulată.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Șterge
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear All Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-2">Confirmare ștergere totală</h3>
              <p className="text-slate-400 mb-6">
                Ești sigur că vrei să ștergi TOATE proiectele salvate? Această acțiune nu poate fi anulată.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Șterge tot
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mode Selector */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-2 mb-6 border border-slate-700">
          <div className="flex">
            <button
              onClick={() => setMode('pfa')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                mode === 'pfa'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span className="text-lg mr-2">👤</span>
              PFA
              <span className="block text-xs opacity-75 mt-0.5">Persoană Fizică Autorizată</span>
            </button>
            <button
              onClick={() => setMode('srl')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                mode === 'srl'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span className="text-lg mr-2">🏢</span>
              SRL
              <span className="block text-xs opacity-75 mt-0.5">Societate cu Răspundere Limitată</span>
            </button>
          </div>
        </div>

        {/* Currency Selector */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 mb-6 border border-slate-700">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Afișează în:</span>
              <div className="flex bg-slate-700/50 rounded-lg p-1">
                {Object.entries(CURRENCIES).map(([code, { flag }]) => (
                  <button
                    key={code}
                    onClick={() => setDisplayCurrency(code as 'RON' | 'EUR' | 'USD')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                      displayCurrency === code
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{flag}</span>
                    <span>{code}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="text-right text-xs">
              {ratesLoading ? (
                <span className="text-slate-500">Se încarcă...</span>
              ) : ratesError ? (
                <span className="text-amber-400">{ratesError}</span>
              ) : (
                <div className="text-slate-500">
                  <span>1 EUR = {formatRON(1 / rates.EUR)} RON</span>
                  <span className="mx-2">•</span>
                  <span>1 USD = {formatRON(1 / rates.USD)} RON</span>
                  {lastUpdated && <span className="ml-2 text-slate-600">({lastUpdated})</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tax Rate Banner */}
        {incomes.length > 0 && (mode === 'pfa' ? pfaCalculations.annualGross : srlCalculations.annualRevenue) > 0 && (
          <div className={`rounded-2xl p-4 mb-6 ${
            mode === 'pfa' 
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30'
              : 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className={`text-sm ${mode === 'pfa' ? 'text-amber-200/80' : 'text-blue-200/80'}`}>
                  Rată efectivă de taxare
                </p>
                <p className={`text-3xl font-bold ${mode === 'pfa' ? 'text-amber-400' : 'text-blue-400'}`}>
                  {calc.effectiveRate.toFixed(0)}%
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm ${mode === 'pfa' ? 'text-amber-200/80' : 'text-blue-200/80'}`}>
                  {mode === 'pfa' ? 'Rămâne în buzunar' : 'Primești personal'}
                </p>
                <p className="text-xl font-semibold text-white">
                  {formatAmount(mode === 'pfa' ? pfaCalculations.canSpend : srlCalculations.totalToOwner)}
                </p>
              </div>
            </div>
            
            {mode === 'pfa' && pfaCalculations.nearCASThreshold && (
              <div className="mt-3 pt-3 border-t border-amber-500/30">
                <p className="text-amber-300 text-sm">
                  ⚠️ Mai ai {formatAmount(pfaCalculations.distanceToCAS)} până la pragul CAS. 
                  Dacă îl depășești, plătești +{formatAmount(CAS_TIER1)} pensie!
                </p>
              </div>
            )}

            {mode === 'srl' && !srlCalculations.canBeMicro && (
              <div className="mt-3 pt-3 border-t border-blue-500/30">
                <p className="text-blue-300 text-sm">
                  ⚠️ Venit peste {formatAmount(MICRO_REVENUE_LIMIT)} — nu mai poți fi microîntreprindere (16% pe profit)
                </p>
              </div>
            )}
          </div>
        )}

        {/* PFA Options */}
        {mode === 'pfa' && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 mb-6 border border-slate-700">
            <h3 className="text-white font-medium mb-3">Opțiuni PFA</h3>
            
            <div className="space-y-4">
              {/* Employment status */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-slate-300 text-sm">Am și contract de muncă</p>
                    <p className="text-slate-500 text-xs">Dacă ești angajat, CASS-ul poate fi scutit pentru venituri mici din PFA</p>
                  </div>
                  <button
                    onClick={() => setPfaOptions({...pfaOptions, isEmployed: !pfaOptions.isEmployed})}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      pfaOptions.isEmployed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                        : 'bg-slate-600/50 text-slate-400 border border-slate-500/50'
                    }`}
                  >
                    {pfaOptions.isEmployed ? '✓ Da' : 'Nu'}
                  </button>
                </div>
                
                {pfaOptions.isEmployed && (
                  <div className="flex items-center gap-3 mt-2">
                    <label className="text-slate-400 text-sm">Salariu brut lunar din angajare:</label>
                    <input
                      type="number"
                      value={pfaOptions.employmentGrossSalary || ''}
                      onChange={(e) => setPfaOptions({...pfaOptions, employmentGrossSalary: Number(e.target.value) || 0})}
                      className="w-32 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm"
                      placeholder="0"
                    />
                    <span className="text-slate-500 text-sm">RON</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SRL Options */}
        {mode === 'srl' && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 mb-6 border border-slate-700">
            <h3 className="text-white font-medium mb-3">Opțiuni SRL</h3>
            
            <div className="space-y-4">
              {/* Micro vs Standard */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">Tip impozitare</p>
                  <p className="text-slate-500 text-xs">
                    {srlCalculations.canBeMicro 
                      ? 'Poți alege microîntreprindere (1% pe venit)' 
                      : 'Venit prea mare pentru micro'}
                  </p>
                </div>
                <div className="flex bg-slate-700/50 rounded-lg p-1">
                  <button
                    onClick={() => setSrlOptions({...srlOptions, isMicro: true})}
                    disabled={!srlCalculations.canBeMicro}
                    className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                      srlOptions.isMicro && srlCalculations.canBeMicro
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:text-white disabled:opacity-50'
                    }`}
                  >
                    Micro 1%
                  </button>
                  <button
                    onClick={() => setSrlOptions({...srlOptions, isMicro: false})}
                    className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                      !srlOptions.isMicro || !srlCalculations.canBeMicro
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Standard 16%
                  </button>
                </div>
              </div>

              {/* Dividend percentage */}
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-slate-300 text-sm">Cât extragi ca dividende</p>
                  <p className="text-blue-400 font-medium">{srlOptions.dividendPercent}%</p>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={srlOptions.dividendPercent}
                  onChange={(e) => setSrlOptions({...srlOptions, dividendPercent: Number(e.target.value)})}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0% (reinvestit)</span>
                  <span>100% (extrag tot)</span>
                </div>
              </div>

              {/* VAT options */}
              <div className="pt-2 border-t border-slate-700">
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="text-slate-300 text-sm">Statut TVA</p>
                    <p className="text-slate-500 text-xs">Înregistrare obligatorie peste {formatRON(VAT_THRESHOLD)} RON/an</p>
                  </div>
                  <select
                    value={srlOptions.vatStatus}
                    onChange={(e) => setSrlOptions({...srlOptions, vatStatus: e.target.value as 'not_registered' | 'registered' | 'voluntary'})}
                    className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm"
                  >
                    <option value="not_registered">Neînregistrat</option>
                    <option value="registered">Înregistrat</option>
                    <option value="voluntary">Înregistrat voluntar</option>
                  </select>
                </div>
                
                {srlOptions.vatStatus !== 'not_registered' && (
                  <div className="mt-3">
                    <div className="flex justify-between mb-1">
                      <p className="text-slate-300 text-sm">Facturare intra-UE (TVA 0%)</p>
                      <p className="text-blue-400 font-medium">{srlOptions.euRevenuePercent}%</p>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={srlOptions.euRevenuePercent}
                      onChange={(e) => setSrlOptions({...srlOptions, euRevenuePercent: Number(e.target.value)})}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>0% (doar intern)</span>
                      <span>100% (doar UE)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Salary option */}
              <div className="pt-2 border-t border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-slate-300 text-sm">Te plătești cu salariu?</p>
                    <p className="text-slate-500 text-xs">Contribuții sociale mai mari, dar acces la beneficii</p>
                  </div>
                  <button
                    onClick={() => setSrlOptions({...srlOptions, paySalary: !srlOptions.paySalary})}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      srlOptions.paySalary
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'bg-slate-600/50 text-slate-400 border border-slate-500/50'
                    }`}
                  >
                    {srlOptions.paySalary ? '✓ Da' : 'Nu'}
                  </button>
                </div>
                
                {srlOptions.paySalary && (
                  <div className="flex items-center gap-3 mt-2">
                    <label className="text-slate-400 text-sm">Salariu brut lunar:</label>
                    <input
                      type="number"
                      value={srlOptions.monthlySalary}
                      onChange={(e) => setSrlOptions({...srlOptions, monthlySalary: Number(e.target.value) || 0})}
                      className="w-32 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm"
                    />
                    <span className="text-slate-500 text-sm">RON</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Income Management */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-white">Veniturile tale</h2>
            <button
              onClick={addIncome}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium ${
                mode === 'pfa' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              + Adaugă venit
            </button>
          </div>

          {incomes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-600 rounded-xl">
              <p className="text-slate-400 mb-2">Niciun venit adăugat</p>
              <p className="text-slate-500 text-sm">Adaugă veniturile pentru a calcula taxele</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomes.map((income) => {
                const effectiveRate = mode === 'pfa' ? pfaCalculations.effectiveRate : srlCalculations.effectiveRate;
                const setAside = income.amount * (effectiveRate / 100);
                const canUse = income.amount - setAside;
                
                return (
                  <div key={income.id} className="bg-slate-700/30 rounded-xl border border-slate-600/50 overflow-hidden">
                    <div className="p-4">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[150px]">
                          <label className="block text-slate-500 text-xs mb-1">Descriere</label>
                          <input
                            type="text"
                            placeholder="ex: Client freelance"
                            value={income.name}
                            onChange={(e) => updateIncome(income.id, 'name', e.target.value)}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="w-36">
                          <label className="block text-slate-500 text-xs mb-1">Sumă ({displayCurrency})</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={displayCurrency === 'RON' 
                              ? income.amount || '' 
                              : Math.round(income.amount * rates[displayCurrency as keyof typeof rates]) || ''
                            }
                            onChange={(e) => updateIncome(income.id, 'amount', Number(e.target.value) || 0)}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 text-xs mb-1">Tip</label>
                          <button
                            onClick={() => updateIncome(income.id, 'isRecurring', !income.isRecurring)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                              income.isRecurring
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                : 'bg-slate-600/50 text-slate-300 border border-slate-500/50'
                            }`}
                          >
                            {income.isRecurring ? '🔄 Lunar' : '📌 O dată'}
                          </button>
                        </div>
                        {income.isRecurring && (
                          <div className="w-20">
                            <label className="block text-slate-500 text-xs mb-1">Luni</label>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={income.months}
                              onChange={(e) => updateIncome(income.id, 'months', Number(e.target.value) || 1)}
                              onBlur={(e) => {
                                const value = Math.min(12, Math.max(1, Number(e.target.value) || 1));
                                updateIncome(income.id, 'months', value);
                              }}
                              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            />
                          </div>
                        )}
                        <button
                          onClick={() => removeIncome(income.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {income.amount > 0 && (
                      <div className="bg-slate-800/50 px-4 py-3 border-t border-slate-600/30">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div>
                            <p className="text-slate-500 text-xs">Primești</p>
                            <p className="text-white font-medium">{formatAmount(income.amount)}</p>
                          </div>
                          <span className="text-slate-600">→</span>
                          <div>
                            <p className={`text-xs ${mode === 'pfa' ? 'text-amber-400/80' : 'text-blue-400/80'}`}>Pune deoparte</p>
                            <p className={`font-bold ${mode === 'pfa' ? 'text-amber-400' : 'text-blue-400'}`}>
                              {formatAmount(setAside)}
                            </p>
                          </div>
                          <span className="text-slate-600">→</span>
                          <div>
                            <p className="text-emerald-400/80 text-xs">Poți folosi</p>
                            <p className="text-emerald-400 font-bold">{formatAmount(canUse)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Expenses */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-slate-400 text-sm mb-1">
                  Cheltuieli deductibile lunare (RON)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={monthlyExpenses || ''}
                  onChange={(e) => setMonthlyExpenses(Number(e.target.value) || 0)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              {monthlyExpenses > 0 && (
                <div className="text-right">
                  <p className="text-slate-500 text-xs">Anual</p>
                  <p className="text-slate-300">{formatAmount(monthlyExpenses * 12)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============ PFA TAX BREAKDOWN ============ */}
        {mode === 'pfa' && incomes.length > 0 && pfaCalculations.annualGross > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
            <h2 className="text-lg font-medium text-white mb-4">Taxe anuale PFA</h2>
            
            <div className="bg-slate-700/30 rounded-xl p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Venit brut anual:</span>
                <span className="text-white">{formatAmount(pfaCalculations.annualGross)}</span>
              </div>
              {pfaCalculations.annualExpenses > 0 && (
                <>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">Cheltuieli deductibile:</span>
                    <span className="text-slate-300">-{formatAmount(pfaCalculations.annualExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 pt-1 border-t border-slate-600">
                    <span className="text-slate-300">Venit net:</span>
                    <span className="text-white font-medium">{formatAmount(pfaCalculations.netIncome)}</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-red-300/80 text-sm">Total taxe</p>
                  <p className="text-3xl font-bold text-red-400">{formatAmount(pfaCalculations.totalTaxes)}</p>
                </div>
                <p className="text-slate-400 text-sm">({pfaCalculations.effectiveRate.toFixed(1)}%)</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center py-2 px-3 bg-slate-700/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span>🏥</span>
                  <span className="text-slate-300">CASS (sănătate)</span>
                  <span className="text-slate-500 text-xs">
                    {pfaOptions.isEmployed && pfaCalculations.netIncome < CASS_MIN_THRESHOLD ? 'scutit (angajat)' :
                     pfaOptions.isEmployed ? '10%' :
                     pfaCalculations.netIncome < CASS_MIN_THRESHOLD ? 'minim' : 
                     pfaCalculations.netIncome > CASS_MAX_THRESHOLD ? 'maxim' : '10%'}
                  </span>
                </div>
                <span className="text-white font-medium">{formatAmount(pfaCalculations.cass)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-slate-700/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span>🏦</span>
                  <span className="text-slate-300">CAS (pensie)</span>
                  <span className="text-slate-500 text-xs">
                    {pfaCalculations.casStatus === 'not_required' ? 'sub prag' : 
                     pfaCalculations.casStatus === 'tier1' ? '12 salarii' : '24 salarii'}
                  </span>
                </div>
                <span className="text-white font-medium">{formatAmount(pfaCalculations.cas)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-slate-700/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span>📊</span>
                  <span className="text-slate-300">Impozit pe venit</span>
                  <span className="text-slate-500 text-xs">10%</span>
                </div>
                <span className="text-white font-medium">{formatAmount(pfaCalculations.incomeTax)}</span>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-emerald-300/80">Rămâne în buzunar</p>
                  <p className="text-sm text-slate-400">({formatAmount(pfaCalculations.canSpend / 12)}/lună)</p>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{formatAmount(pfaCalculations.canSpend)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ============ SRL TAX BREAKDOWN ============ */}
        {mode === 'srl' && incomes.length > 0 && srlCalculations.annualRevenue > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
            <h2 className="text-lg font-medium text-white mb-4">Taxe anuale SRL</h2>
            
            {/* Revenue breakdown */}
            <div className="bg-slate-700/30 rounded-xl p-3 mb-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Venit brut anual:</span>
                <span className="text-white">{formatAmount(srlCalculations.annualRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Cheltuieli afacere:</span>
                <span className="text-slate-300">-{formatAmount(srlCalculations.annualExpenses)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Costuri operare (contabil, bancă):</span>
                <span className="text-slate-300">-{formatAmount(srlCalculations.operatingCosts)}</span>
              </div>
              {srlOptions.paySalary && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Cost salariu (cu contribuții):</span>
                  <span className="text-slate-300">-{formatAmount(srlCalculations.salaryCostToCompany)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-1 border-t border-slate-600">
                <span className="text-slate-300">Profit brut:</span>
                <span className="text-white font-medium">{formatAmount(srlCalculations.grossProfit)}</span>
              </div>
            </div>

            {/* Government taxes */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-red-300/80 text-sm">Total taxe guvern</p>
                  <p className="text-3xl font-bold text-red-400">{formatAmount(srlCalculations.totalGovTaxes)}</p>
                </div>
                <p className="text-slate-400 text-sm">({srlCalculations.effectiveRate.toFixed(1)}%)</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center py-2 px-3 bg-slate-700/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span>🏛️</span>
                  <span className="text-slate-300">Impozit firmă</span>
                  <span className="text-slate-500 text-xs">
                    {srlCalculations.isMicro ? '1% pe venit' : '16% pe profit'}
                  </span>
                </div>
                <span className="text-white font-medium">{formatAmount(srlCalculations.corporateTax)}</span>
              </div>
              
              {srlCalculations.dividendAmount > 0 && (
                <div className="flex justify-between items-center py-2 px-3 bg-slate-700/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span>💰</span>
                    <span className="text-slate-300">Impozit dividende</span>
                    <span className="text-slate-500 text-xs">16%</span>
                  </div>
                  <span className="text-white font-medium">{formatAmount(srlCalculations.dividendTax)}</span>
                </div>
              )}

            </div>

            {/* What you get */}
            <div className="space-y-3">
              {srlOptions.paySalary && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-300/80">Salariu net anual</span>
                    <span className="text-blue-400 font-medium">{formatAmount(srlCalculations.salaryNetToOwner)}</span>
                  </div>
                </div>
              )}
              
              {srlCalculations.dividendNet > 0 && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-300/80">Dividende nete</span>
                    <span className="text-purple-400 font-medium">{formatAmount(srlCalculations.dividendNet)}</span>
                  </div>
                </div>
              )}

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-emerald-300/80">Total primit personal</p>
                    <p className="text-sm text-slate-400">({formatAmount(srlCalculations.totalToOwner / 12)}/lună)</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{formatAmount(srlCalculations.totalToOwner)}</p>
                </div>
              </div>

              {srlCalculations.retainedProfit > 0 && (
                <div className="bg-slate-700/30 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Rămâne în firmă (reinvestit)</span>
                    <span className="text-slate-300">{formatAmount(srlCalculations.retainedProfit)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* VAT status - shown separately as it's a pass-through tax */}
            {srlCalculations.isVATRegistered && srlCalculations.vatToPay > 0 && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-amber-300 font-medium">TVA de virat la stat</p>
                    <p className="text-amber-500/70 text-xs">Impozit indirect (colectat de la clienți)</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">{formatAmount(srlCalculations.vatToPay)}</p>
                </div>
                <div className="text-xs text-amber-500/70 space-y-1">
                  <div className="flex justify-between">
                    <span>TVA colectat:</span>
                    <span>{formatAmount(srlCalculations.vatCollected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA deductibil:</span>
                    <span>-{formatAmount(srlCalculations.vatOnExpenses)}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-slate-700/20 rounded-lg">
              <p className="text-slate-400 text-xs">
                {srlCalculations.isVATRegistered 
                  ? `ℹ️ Înregistrat în scopuri de TVA`
                  : `✓ Neînregistrat TVA (sub ${formatRON(VAT_THRESHOLD)} RON sau opțional)`
                }
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Calcule orientative 2026 • Declarația Unică: 25 martie • Salariu minim: {formatRON(MINIMUM_SALARY)} RON
        </p>
      </div>
    </div>
  );
}