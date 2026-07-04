import { createContext, useContext, useState, ReactNode } from 'react';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rate: number;   // 1 INR = rate units of this currency
  flag: string;
}

export const CURRENCIES: Record<string, Currency> = {
  INR: { code: 'INR', symbol: '₹',  name: 'Indian Rupee',       rate: 1,       flag: '🇮🇳' },
  USD: { code: 'USD', symbol: '$',  name: 'US Dollar',          rate: 0.012,   flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€',  name: 'Euro',               rate: 0.011,   flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£',  name: 'British Pound',      rate: 0.0095,  flag: '🇬🇧' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar',  rate: 0.019,   flag: '🇦🇺' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar',   rate: 0.016,   flag: '🇸🇬' },
  KRW: { code: 'KRW', symbol: '₩',  name: 'Korean Won',         rate: 16.2,    flag: '🇰🇷' },
};

function detectCurrencyCode(): string {
  const saved = localStorage.getItem('retralabs_currency');
  if (saved && CURRENCIES[saved]) return saved;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'INR';
    if (tz === 'Europe/London')    return 'GBP';
    if (tz.startsWith('Europe/'))  return 'EUR';
    if (tz.startsWith('America/')) return 'USD';
    if (tz.startsWith('Australia/')) return 'AUD';
    if (tz === 'Asia/Singapore')   return 'SGD';
    if (tz === 'Asia/Seoul')       return 'KRW';
  } catch { /* ignore */ }

  return 'INR';
}

interface CurrencyContextType {
  currency: Currency;
  setCurrencyCode: (code: string) => void;
  format: (priceInr: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<string>(detectCurrencyCode);

  const setCurrencyCode = (c: string) => {
    localStorage.setItem('retralabs_currency', c);
    setCode(c);
  };

  const currency = CURRENCIES[code] ?? CURRENCIES.INR;

  const format = (priceInr: number): string => {
    const val = priceInr * currency.rate;
    if (currency.code === 'INR') {
      return `₹${Math.round(val).toLocaleString('en-IN')}`;
    }
    if (currency.code === 'KRW') {
      return `₩${Math.round(val).toLocaleString('ko-KR')}`;
    }
    return `${currency.symbol}${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrencyCode, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
