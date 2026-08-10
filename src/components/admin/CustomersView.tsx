import { useMemo, useState } from 'react';
import { Users, Search, Phone, Mail, MapPin, ShoppingBag, IndianRupee } from 'lucide-react';
import type { AirtableRecord } from './types';

interface CustomersViewProps {
  records: AirtableRecord[];
  onRowClick: (r: AirtableRecord) => void;
}

interface Customer {
  name: string;
  phone: string;
  email: string;
  address: string;
  orderCount: number;
  totalSpent: number;
  lastOrder: string;
  records: AirtableRecord[];
}

export function CustomersView({ records, onRowClick }: CustomersViewProps) {
  const [search, setSearch] = useState('');

  const customers = useMemo(() => {
    const map = new Map<string, Customer>();
    records.forEach((r) => {
      const name = String(r.fields['Name'] ?? '').trim();
      if (!name) return;
      const phone = String(r.fields['Phone'] ?? '');
      const key = phone || name;
      const existing = map.get(key);
      const total = Number(r.fields['Total (₹)'] || 0);
      const created = String(r.fields['Created'] ?? '');
      if (existing) {
        existing.orderCount++;
        existing.totalSpent += total;
        if (created > existing.lastOrder) existing.lastOrder = created;
        existing.records.push(r);
      } else {
        map.set(key, {
          name,
          phone,
          email: String(r.fields['Email'] ?? ''),
          address: String(r.fields['Address'] ?? ''),
          orderCount: 1,
          totalSpent: total,
          lastOrder: created,
          records: [r],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [records]);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center"><Users className="w-[18px] h-[18px] text-blue-600" /></div>
          <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{customers.length}</p>
          <p className="text-xs text-slate-500">Total Customers</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center"><IndianRupee className="w-[18px] h-[18px] text-emerald-600" /></div>
          <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">₹{customers.reduce((s, c) => s + c.totalSpent, 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500">Total Spent</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center"><ShoppingBag className="w-[18px] h-[18px] text-violet-600" /></div>
          <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{customers.filter((c) => c.orderCount > 1).length}</p>
          <p className="text-xs text-slate-500">Repeat Customers</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center"><ShoppingBag className="w-[18px] h-[18px] text-amber-600" /></div>
          <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">
            {customers.length ? Math.round(customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length).toLocaleString('en-IN') : 0}
          </p>
          <p className="text-xs text-slate-500">Avg Customer Value</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 transition-colors"
        />
      </div>

      {/* Customer list */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-12 text-sm text-slate-400 text-center">No customers found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <div key={c.name + c.phone} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{c.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{c.name}</p>
                      {c.orderCount > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600">
                          {c.orderCount} orders
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                      {c.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.address.slice(0, 60)}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">₹{c.totalSpent.toLocaleString('en-IN')}</p>
                    <p className="text-[11px] text-slate-400">Last: {c.lastOrder || '—'}</p>
                  </div>
                </div>
                {c.orderCount > 1 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.records.slice(0, 4).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => onRowClick(r)}
                        className="text-[11px] font-medium px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors"
                      >
                        {String(r.fields['orderID'] ?? r.id.slice(0, 6))} · ₹{Number(r.fields['Total (₹)'] || 0).toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
