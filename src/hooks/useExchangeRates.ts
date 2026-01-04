import { useState, useEffect, useCallback } from 'react';
import { FALLBACK_RATES, CURRENCIES } from '../constants/tax';
import type { CurrencyCode } from '../constants/tax';

export type ExchangeRates = typeof FALLBACK_RATES;

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_RATES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('https://api.frankfurter.app/latest?from=RON&to=EUR,USD');
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        setRates({ RON: 1, EUR: data.rates.EUR, USD: data.rates.USD });
        setError(null);
      } catch {
        setRates(FALLBACK_RATES);
        setError('Using fallback rates');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRates();
    const interval = setInterval(fetchRates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toDisplayCurrency = useCallback((ronAmount: number, currency: CurrencyCode) => {
    return ronAmount * rates[currency];
  }, [rates]);

  const fromDisplayCurrency = useCallback((amount: number, currency: CurrencyCode) => {
    return amount / rates[currency];
  }, [rates]);

  const formatAmount = useCallback((ronAmount: number, currency: CurrencyCode) => {
    const converted = toDisplayCurrency(ronAmount, currency);
    const curr = CURRENCIES[currency];
    if (currency === 'RON') {
      return `${new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.round(converted))} RON`;
    }
    return `${curr.symbol}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(converted))}`;
  }, [toDisplayCurrency]);

  const formatCompact = useCallback((ronAmount: number, currency: CurrencyCode) => {
    const converted = toDisplayCurrency(ronAmount, currency);
    const curr = CURRENCIES[currency];
    const formatted = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.round(converted));
    return currency === 'RON' ? `${formatted} RON` : `${curr.symbol}${formatted}`;
  }, [toDisplayCurrency]);

  return {
    rates,
    isLoading,
    error,
    toDisplayCurrency,
    fromDisplayCurrency,
    formatAmount,
    formatCompact,
  };
}

