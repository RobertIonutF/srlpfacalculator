import { useState } from 'react';
import { useTaxStore } from './store/useTaxStore';
import { useExchangeRates } from './hooks/useExchangeRates';
import { usePFACalculations, useSRLCalculations } from './hooks/useTaxCalculations';
import { CircularProgress, ProgressBar, ToggleSwitch } from './components/ui';
import { CURRENCIES, VAT_THRESHOLD, MINIMUM_SALARY, CASS_MIN_THRESHOLD } from './constants/tax';
import type { CurrencyCode } from './constants/tax';

export default function TaxCalculator() {
  const {
    currentProject, projects, activeProjectId,
    setMode, setIncomes, setMonthlyExpenses, setDisplayCurrency,
    setSrlOptions, setPfaOptions, saveProject, loadProject, deleteProject,
    exportProjects, importProjects,
  } = useTaxStore();
  
  const { 
    mode, incomes, monthlyExpenses, displayCurrency, 
    srlOptions: rawSrlOptions, 
    pfaOptions = { isEmployed: false, employmentGrossSalary: 0 } 
  } = currentProject;
  
  const srlOptions = {
    ...rawSrlOptions,
    vatStatus: rawSrlOptions.vatStatus || 'not_registered',
    euRevenuePercent: rawSrlOptions.euRevenuePercent ?? 0,
  };
  
  const [projectName, setProjectName] = useState('');
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ options: true });

  const { rates, formatAmount, formatCompact } = useExchangeRates();
  const pfaCalc = usePFACalculations(incomes, monthlyExpenses, pfaOptions);
  const srlCalc = useSRLCalculations(incomes, monthlyExpenses, srlOptions as any);

  const currency = displayCurrency as CurrencyCode;

  // Helpers
  const addIncome = () => {
    setIncomes([...incomes, { id: Date.now(), name: '', amount: 0, isRecurring: false, months: 1 }]);
  };

  const updateIncome = (id: number, field: string, value: any) => {
    if (field === 'amount' && currency !== 'RON') {
      const ronValue = value / rates[currency];
      setIncomes(incomes.map(inc => inc.id === id ? { ...inc, [field]: ronValue } : inc));
    } else {
      setIncomes(incomes.map(inc => inc.id === id ? { ...inc, [field]: value } : inc));
    }
  };

  const removeIncome = (id: number) => setIncomes(incomes.filter(inc => inc.id !== id));

  const handleSaveProject = () => {
    if (!projectName.trim()) return;
    saveProject(projectName.trim());
    setProjectName('');
  };

  const handleExport = () => {
    const json = exportProjects();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-calculator-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => importProjects(e.target?.result as string);
    reader.readAsText(file);
    event.target.value = '';
  };

  const calc = mode === 'pfa' ? pfaCalc : srlCalc;
  const hasIncome = incomes.length > 0 && (mode === 'pfa' ? pfaCalc.annualGross : srlCalc.annualRevenue) > 0;
  const accentColor = mode === 'pfa' ? '#14b8a6' : '#6366f1';

  return (
    <div className="min-h-screen p-4 lg:p-6">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-6">
        <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === 'pfa' ? 'bg-teal-500/20' : 'bg-indigo-500/20'}`}>
              <span className="text-xl">{mode === 'pfa' ? '👤' : '🏢'}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Calculator Taxe 2026</h1>
              <p className="text-slate-500 text-xs">PFA vs SRL • România</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800/50 rounded-lg p-1">
              {Object.entries(CURRENCIES).map(([code, { flag }]) => (
                <button
                  key={code}
                  onClick={() => setDisplayCurrency(code as CurrencyCode)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                    currency === code
                      ? `${mode === 'pfa' ? 'bg-teal-500' : 'bg-indigo-500'} text-white`
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-base">{flag}</span>
                  <span className="hidden sm:inline">{code}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowProjectPanel(!showProjectPanel)}
            className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors flex items-center gap-2"
          >
            <span>💾</span>
            <span className="hidden sm:inline">Proiecte</span>
            {projects.length > 0 && <span className="bg-slate-600 px-1.5 py-0.5 rounded text-xs">{projects.length}</span>}
          </button>
        </div>

        {showProjectPanel && (
          <div className="glass-card rounded-2xl p-4 mt-3 animate-slide-up">
            <div className="flex flex-wrap gap-3 items-end">
              {projects.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-slate-500 text-xs mb-1">Încarcă</label>
                  <select
                    value={activeProjectId || ''}
                    onChange={(e) => e.target.value && loadProject(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="">-- Selectează --</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-slate-500 text-xs mb-1">Salvează</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nume..."
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveProject()}
                    className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <button onClick={handleSaveProject} className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white">💾</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleExport} className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 text-sm">📤</button>
                <label className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 text-sm cursor-pointer">
                  📥<input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
                {activeProjectId && (
                  <button onClick={() => deleteProject(activeProjectId)} className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm">🗑️</button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto">
        {/* HERO METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`glass-card rounded-2xl p-5 ${mode === 'pfa' ? 'glow-pfa' : 'glow-srl'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Rată efectivă taxare</p>
                <p className={`text-4xl font-bold font-mono-nums ${mode === 'pfa' ? 'gradient-text-pfa' : 'gradient-text-srl'}`}>
                  {hasIncome ? `${calc.effectiveRate.toFixed(0)}%` : '—'}
                </p>
              </div>
              {hasIncome && <CircularProgress value={calc.effectiveRate} max={50} size={70} strokeWidth={6} color={accentColor} />}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-slate-400 text-sm mb-1">Total taxe anuale</p>
            <p className="text-4xl font-bold font-mono-nums gradient-text-danger">
              {hasIncome ? formatCompact(mode === 'pfa' ? pfaCalc.totalTaxes : srlCalc.totalGovTaxes, currency) : '—'}
            </p>
            {hasIncome && <p className="text-slate-500 text-xs mt-1">{formatAmount((mode === 'pfa' ? pfaCalc.totalTaxes : srlCalc.totalGovTaxes) / 12, currency)}/lună</p>}
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-slate-400 text-sm mb-1">Rămâne în buzunar</p>
            <p className="text-4xl font-bold font-mono-nums gradient-text-success">
              {hasIncome ? formatCompact(mode === 'pfa' ? pfaCalc.canSpend : srlCalc.totalToOwner, currency) : '—'}
            </p>
            {hasIncome && <p className="text-slate-500 text-xs mt-1">{formatAmount((mode === 'pfa' ? pfaCalc.canSpend : srlCalc.totalToOwner) / 12, currency)}/lună</p>}
          </div>
        </div>

        {/* MODE TOGGLE */}
        <div className="glass-card rounded-2xl p-2 mb-6">
          <div className="grid grid-cols-2 gap-2">
            {(['pfa', 'srl'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-3 ${
                  mode === m
                    ? m === 'pfa' 
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25'
                      : 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span className="text-2xl">{m === 'pfa' ? '👤' : '🏢'}</span>
                <div className="text-left">
                  <p className="font-semibold">{m.toUpperCase()}</p>
                  <p className="text-xs opacity-75">{m === 'pfa' ? 'Persoană Fizică Autorizată' : 'Societate cu Răspundere Limitată'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT: INPUTS */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Venituri</h2>
                <button
                  onClick={addIncome}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl font-bold transition-all ${
                    mode === 'pfa' ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30' : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                  }`}
                >+</button>
              </div>

              {incomes.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                  <p className="text-slate-500 text-sm">Adaugă primul venit</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomes.map((income) => (
                    <div key={income.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 hover:border-slate-600 transition-colors">
                      <div className="flex gap-2 items-center mb-2">
                        <input
                          type="text"
                          placeholder="Descriere..."
                          value={income.name}
                          onChange={(e) => updateIncome(income.id, 'name', e.target.value)}
                          className="flex-1 bg-transparent border-none text-white text-sm placeholder:text-slate-600 focus:outline-none"
                        />
                        <button onClick={() => removeIncome(income.id)} className="w-7 h-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm">×</button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          placeholder="0"
                          value={currency === 'RON' ? income.amount || '' : Math.round(income.amount * rates[currency]) || ''}
                          onChange={(e) => updateIncome(income.id, 'amount', Number(e.target.value) || 0)}
                          className="flex-1 bg-slate-700/50 rounded-lg px-3 py-2 text-white text-sm font-mono-nums"
                        />
                        <span className="text-slate-500 text-xs w-10">{currency}</span>
                        <button
                          onClick={() => updateIncome(income.id, 'isRecurring', !income.isRecurring)}
                          className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${income.isRecurring ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-500'}`}
                        >{income.isRecurring ? '🔄' : '📌'}</button>
                        {income.isRecurring && (
                          <input
                            type="number"
                            value={income.months}
                            onChange={(e) => updateIncome(income.id, 'months', Number(e.target.value) || 1)}
                            onBlur={(e) => updateIncome(income.id, 'months', Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                            className="w-12 bg-slate-700/50 rounded-lg px-2 py-2 text-white text-sm text-center"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <label className="block text-slate-400 text-sm mb-2">Cheltuieli lunare</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0"
                    value={monthlyExpenses || ''}
                    onChange={(e) => setMonthlyExpenses(Number(e.target.value) || 0)}
                    className="flex-1 bg-slate-700/50 rounded-lg px-3 py-2 text-white text-sm font-mono-nums"
                  />
                  <span className="text-slate-500 text-sm">RON/lună</span>
                </div>
              </div>
            </div>

            {/* OPTIONS */}
            <div className="glass-card rounded-2xl p-5">
              <button 
                onClick={() => setExpandedSections({...expandedSections, options: !expandedSections.options})}
                className="w-full flex justify-between items-center mb-3"
              >
                <h2 className="text-lg font-semibold text-white">Opțiuni {mode.toUpperCase()}</h2>
                <span className={`text-slate-500 transition-transform ${expandedSections.options ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {expandedSections.options && (
                <div className="space-y-4 animate-fade-in">
                  {mode === 'pfa' ? (
                    <div>
                      <ToggleSwitch
                        enabled={pfaOptions.isEmployed}
                        onChange={() => setPfaOptions({...pfaOptions, isEmployed: !pfaOptions.isEmployed})}
                        label="Am și contract de muncă"
                        description="CASS scutit pentru venituri mici din PFA"
                      />
                      {pfaOptions.isEmployed && (
                        <div className="mt-3 pl-4 border-l-2 border-slate-700">
                          <label className="block text-slate-500 text-xs mb-1">Salariu brut lunar</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={pfaOptions.employmentGrossSalary || ''}
                              onChange={(e) => setPfaOptions({...pfaOptions, employmentGrossSalary: Number(e.target.value) || 0})}
                              className="w-32 bg-slate-700/50 rounded-lg px-3 py-2 text-white text-sm"
                            />
                            <span className="text-slate-500 text-sm">RON</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-slate-400 text-sm mb-2">Tip impozitare</p>
                        <div className="flex bg-slate-800/50 rounded-lg p-1">
                          <button
                            onClick={() => setSrlOptions({...srlOptions, isMicro: true})}
                            disabled={!srlCalc.canBeMicro}
                            className={`flex-1 py-2 px-3 rounded-md text-sm transition-all ${srlOptions.isMicro && srlCalc.canBeMicro ? 'bg-indigo-500 text-white' : 'text-slate-400 disabled:opacity-50'}`}
                          >Micro 1%</button>
                          <button
                            onClick={() => setSrlOptions({...srlOptions, isMicro: false})}
                            className={`flex-1 py-2 px-3 rounded-md text-sm transition-all ${!srlOptions.isMicro || !srlCalc.canBeMicro ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
                          >Standard 16%</button>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <p className="text-slate-400 text-sm">Dividende extrase</p>
                          <span className="text-indigo-400 font-medium">{srlOptions.dividendPercent}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="10" value={srlOptions.dividendPercent} onChange={(e) => setSrlOptions({...srlOptions, dividendPercent: Number(e.target.value)})} className="w-full accent-indigo-500" />
                      </div>

                      <div>
                        <p className="text-slate-400 text-sm mb-2">Statut TVA</p>
                        <select value={srlOptions.vatStatus} onChange={(e) => setSrlOptions({...srlOptions, vatStatus: e.target.value as any})} className="w-full bg-slate-700/50 rounded-lg px-3 py-2 text-white text-sm">
                          <option value="not_registered">Neînregistrat TVA</option>
                          <option value="registered">Înregistrat TVA (obligatoriu peste {(VAT_THRESHOLD/1000).toFixed(0)}k RON)</option>
                          <option value="voluntary">Înregistrat voluntar</option>
                        </select>
                        {srlOptions.vatStatus !== 'not_registered' && (
                          <div className="mt-3">
                            <div className="flex justify-between mb-1">
                              <p className="text-slate-500 text-xs">Facturare UE (TVA 0%)</p>
                              <span className="text-blue-400 text-sm">{srlOptions.euRevenuePercent}%</span>
                            </div>
                            <input type="range" min="0" max="100" step="5" value={srlOptions.euRevenuePercent} onChange={(e) => setSrlOptions({...srlOptions, euRevenuePercent: Number(e.target.value)})} className="w-full accent-blue-500" />
                          </div>
                        )}
                      </div>

                      <ToggleSwitch enabled={srlOptions.paySalary} onChange={() => setSrlOptions({...srlOptions, paySalary: !srlOptions.paySalary})} label="Plătesc salariu" description="Contribuții sociale, acces la beneficii" />
                      {srlOptions.paySalary && (
                        <div className="pl-4 border-l-2 border-slate-700">
                          <label className="block text-slate-500 text-xs mb-1">Salariu brut lunar</label>
                          <div className="flex items-center gap-2">
                            <input type="number" value={srlOptions.monthlySalary || ''} onChange={(e) => setSrlOptions({...srlOptions, monthlySalary: Number(e.target.value) || 0})} className="w-32 bg-slate-700/50 rounded-lg px-3 py-2 text-white text-sm" />
                            <span className="text-slate-500 text-sm">RON</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: RESULTS */}
          <div className="space-y-4">
            {hasIncome ? (
              <>
                <div className="glass-card rounded-2xl p-5">
                  <h2 className="text-lg font-semibold text-white mb-4">Detalii Taxe {mode.toUpperCase()}</h2>

                  <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Venit brut anual</span>
                      <span className="text-white font-semibold font-mono-nums">{formatAmount(mode === 'pfa' ? pfaCalc.annualGross : srlCalc.annualRevenue, currency)}</span>
                    </div>
                    {(mode === 'pfa' ? pfaCalc.annualExpenses : srlCalc.annualExpenses) > 0 && (
                      <div className="flex justify-between items-center mt-2 text-sm">
                        <span className="text-slate-500">Cheltuieli</span>
                        <span className="text-slate-400 font-mono-nums">-{formatAmount(mode === 'pfa' ? pfaCalc.annualExpenses : srlCalc.annualExpenses, currency)}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {mode === 'pfa' ? (
                      <>
                        <ProgressBar value={pfaCalc.cass} max={pfaCalc.totalTaxes} color="#f59e0b" label="🏥 CASS (sănătate)" amount={formatAmount(pfaCalc.cass, currency)} />
                        <ProgressBar value={pfaCalc.cas} max={pfaCalc.totalTaxes} color="#8b5cf6" label="🏦 CAS (pensie)" amount={formatAmount(pfaCalc.cas, currency)} />
                        <ProgressBar value={pfaCalc.incomeTax} max={pfaCalc.totalTaxes} color="#f43f5e" label="📊 Impozit venit" amount={formatAmount(pfaCalc.incomeTax, currency)} />
                      </>
                    ) : (
                      <>
                        <ProgressBar value={srlCalc.corporateTax} max={srlCalc.totalGovTaxes || 1} color="#6366f1" label={`🏛️ Impozit firmă (${srlCalc.isMicro ? '1%' : '16%'})`} amount={formatAmount(srlCalc.corporateTax, currency)} />
                        {srlCalc.dividendTax > 0 && <ProgressBar value={srlCalc.dividendTax} max={srlCalc.totalGovTaxes || 1} color="#a855f7" label="💰 Impozit dividende (16%)" amount={formatAmount(srlCalc.dividendTax, currency)} />}
                        {srlOptions.paySalary && <ProgressBar value={srlCalc.salaryEmployeeCAS + srlCalc.salaryEmployeeCASS + srlCalc.salaryIncomeTax} max={srlCalc.totalGovTaxes || 1} color="#f59e0b" label="👤 Contribuții salariu" amount={formatAmount(srlCalc.salaryEmployeeCAS + srlCalc.salaryEmployeeCASS + srlCalc.salaryIncomeTax, currency)} />}
                      </>
                    )}
                  </div>

                  {mode === 'srl' && srlCalc.isVATRegistered && srlCalc.vatToPay > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-amber-400 font-medium text-sm">TVA de virat</p>
                            <p className="text-amber-500/70 text-xs">Colectat de la clienți</p>
                          </div>
                          <span className="text-amber-400 font-bold font-mono-nums">{formatAmount(srlCalc.vatToPay, currency)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`glass-card rounded-2xl p-5 ${mode === 'pfa' ? 'glow-pfa' : 'glow-srl'}`}>
                  <h2 className="text-lg font-semibold text-white mb-4">Ce primești</h2>
                  
                  {mode === 'srl' && srlOptions.paySalary && (
                    <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                      <span className="text-slate-400">Salariu net anual</span>
                      <span className="text-blue-400 font-semibold font-mono-nums">{formatAmount(srlCalc.salaryNetToOwner, currency)}</span>
                    </div>
                  )}
                  
                  {mode === 'srl' && srlCalc.dividendNet > 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                      <span className="text-slate-400">Dividende nete</span>
                      <span className="text-purple-400 font-semibold font-mono-nums">{formatAmount(srlCalc.dividendNet, currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-4">
                    <div>
                      <p className={`font-semibold ${mode === 'pfa' ? 'text-teal-400' : 'text-indigo-400'}`}>Total anual</p>
                      <p className="text-slate-500 text-sm">{formatAmount((mode === 'pfa' ? pfaCalc.canSpend : srlCalc.totalToOwner) / 12, currency)}/lună</p>
                    </div>
                    <p className={`text-3xl font-bold font-mono-nums ${mode === 'pfa' ? 'gradient-text-pfa' : 'gradient-text-srl'}`}>
                      {formatAmount(mode === 'pfa' ? pfaCalc.canSpend : srlCalc.totalToOwner, currency)}
                    </p>
                  </div>

                  {mode === 'srl' && srlCalc.retainedProfit > 0 && (
                    <div className="mt-2 pt-3 border-t border-slate-700/50">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Rămâne în firmă</span>
                        <span className="text-slate-400 font-mono-nums">{formatAmount(srlCalc.retainedProfit, currency)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {mode === 'pfa' && pfaOptions.isEmployed && pfaCalc.netIncome < CASS_MIN_THRESHOLD && (
                  <div className="glass-card rounded-xl p-4">
                    <p className="text-emerald-400 text-sm">✓ CASS scutit - venitul PFA este sub pragul de {formatAmount(CASS_MIN_THRESHOLD, currency)}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card rounded-2xl p-8 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-white mb-2">Adaugă veniturile</h3>
                <p className="text-slate-500">Rezultatele vor apărea aici.</p>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-slate-600 text-xs">Calcule orientative 2026 • Declarația Unică: 25 mai • Salariu minim: {new Intl.NumberFormat('ro-RO').format(MINIMUM_SALARY)} RON</p>
          <p className="text-slate-700 text-xs mt-1">Consultă un contabil pentru situația ta specifică</p>
        </footer>
      </main>
    </div>
  );
}
