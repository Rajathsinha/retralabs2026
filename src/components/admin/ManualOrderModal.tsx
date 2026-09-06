import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Package,
  Truck,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  parseBulkAddressText,
  parseAddressBlock,
  type ParsedManualOrder,
  type ParserDefaults,
} from '../../utils/addressParser';
import { ALL_REGION_NAMES } from '../../data/indianStates';
import { adminFetch } from '../../utils/adminAuth';

interface ManualOrderModalProps {
  onClose: () => void;
  onOrdersCreated: () => void;
}

interface OrderResultItem {
  success: boolean;
  orderId?: string;
  recordId?: string;
  name: string;
  phone: string;
  pincode: string;
  provider?: 'Innofulfill' | 'Shiprocket';
  innofulfillOrderId?: string;
  awbNumber?: string;
  shipmentStatus?: string;
  error?: string;
  warning?: string | null;
}

const SAMPLE_SINGLE = `TO,
Rahul Sharma
Flat 402, Sunshine Apartments, Indiranagar, Bangalore, Karnataka - 560038
9876543210`;

const SAMPLE_BULK = `TO,
Amit Verma
123 Park Avenue, Sector 15, Gurgaon, Haryana 122001
9876543210


TO,
Pooja Patel
B-201, Green Heights, SG Highway, Ahmedabad, Gujarat 380015
9123456789


TO,
Dr. Vikram Singh
House No 45, Civil Lines, Jaipur, Rajasthan 302006
9829012345`;

const PRODUCT_PRESETS = [
  'Retratrutide Starter Kit',
  'Retratrutide 5mg vial',
  'Retratrutide 10mg vial',
  'Tirzepatide Starter Kit',
  'Custom Item',
];

export function ManualOrderModal({ onClose, onOrdersCreated }: ManualOrderModalProps) {
  const [inputText, setInputText] = useState('');
  const [defaultPrice, setDefaultPrice] = useState<number>(1000);
  const [defaultItem, setDefaultItem] = useState<string>('Retratrutide Starter Kit');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'prepay' | 'cod'>('prepay');
  const [defaultDeliveryOption, setDefaultDeliveryOption] = useState<'normal' | 'fast'>('normal');

  // Parsed items list that the user can interactively edit
  const [items, setItems] = useState<ParsedManualOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'input' | 'preview' | 'results'>('input');
  
  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [results, setResults] = useState<OrderResultItem[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // Automatically update parsed items whenever input text or defaults change
  useEffect(() => {
    if (!inputText.trim()) {
      setItems([]);
      return;
    }
    const defaults: ParserDefaults = {
      defaultPrice,
      defaultItem,
      defaultPaymentMethod,
      defaultDeliveryOption,
    };
    const parsed = parseBulkAddressText(inputText, defaults);
    setItems(parsed);
  }, [inputText, defaultPrice, defaultItem, defaultPaymentMethod, defaultDeliveryOption]);

  const validCount = useMemo(() => items.filter((i) => i.isValid).length, [items]);

  const handleUpdateItem = (index: number, field: keyof ParsedManualOrder, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      
      // Re-evaluate validity
      const errs: string[] = [];
      if (!item.name || item.name.length < 2) errs.push('Customer Name is required');
      if (!item.phone || item.phone.length !== 10) errs.push('10-digit phone number is required');
      if (!item.pincode || !/^[1-9][0-9]{5}$/.test(item.pincode)) errs.push('Valid 6-digit PIN is required');
      if (!item.address || item.address.length < 5) errs.push('Address is required');
      
      item.validationErrors = errs;
      item.isValid = errs.length === 0;
      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddNewManual = () => {
    const newItem = parseAddressBlock(
      'TO,\nCustomer Name\nFull Address with Pincode 560001\n9999999999',
      { defaultPrice, defaultItem, defaultPaymentMethod, defaultDeliveryOption },
      items.length,
    );
    setItems((prev) => [...prev, newItem]);
    setActiveTab('preview');
  };

  const handleCreateOrders = async () => {
    const validItems = items.filter((i) => i.isValid);
    if (!validItems.length) return;

    setSubmitting(true);
    setApiError(null);
    setProgressMsg(`Submitting ${validItems.length} order(s)...`);
    setActiveTab('results');

    try {
      const payload = {
        orders: validItems.map((item) => ({
          name: item.name,
          phone: item.phone,
          address: item.address,
          city: item.city,
          state: item.state,
          pincode: item.pincode,
          item: item.item,
          price: item.price,
          paymentMethod: item.paymentMethod,
          deliveryOption: item.deliveryOption,
          email: item.email,
        })),
      };

      const res = await adminFetch('/api/admin-create-manual-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Order creation failed (HTTP ${res.status})`);
      }

      setResults(data?.results || []);
      onOrdersCreated();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-[fadeIn_0.15s_ease]">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create Manual / Bulk Orders</h2>
              <p className="text-xs text-slate-500">
                Paste address text from WhatsApp/Notes → Auto-creates in Airtable & routes to Innofulfill or Shiprocket
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Batch Controls */}
        <div className="px-6 py-3.5 bg-slate-100/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          {/* Pricing Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Price:</span>
            <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200 shadow-sm">
              {[1000, 3000].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDefaultPrice(p)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    defaultPrice === p
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  ₹{p.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Product Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Product:</span>
            <select
              value={defaultItem}
              onChange={(e) => setDefaultItem(e.target.value)}
              className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-sm outline-none focus:border-blue-500"
            >
              {PRODUCT_PRESETS.map((prod) => (
                <option key={prod} value={prod}>
                  {prod}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Payment:</span>
            <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200 shadow-sm">
              {(['prepay', 'cod'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDefaultPaymentMethod(mode)}
                  className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-all ${
                    defaultPaymentMethod === mode
                      ? mode === 'prepay'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {mode === 'prepay' ? 'Prepaid' : 'COD'}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Speed */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Speed:</span>
            <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200 shadow-sm">
              {(['normal', 'fast'] as const).map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setDefaultDeliveryOption(speed)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    defaultDeliveryOption === speed
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {speed === 'fast' ? '⚡ Express (Air)' : 'Standard'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          <button
            onClick={() => setActiveTab('input')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'input'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Copy className="w-4 h-4" />
            1. Paste Addresses ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            2. Review & Edit ({validCount}/{items.length} Ready)
          </button>
          {results.length > 0 && (
            <button
              onClick={() => setActiveTab('results')}
              className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'results'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Truck className="w-4 h-4" />
              3. Results Summary ({results.length})
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
          {/* TAB 1: INPUT */}
          {activeTab === 'input' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Paste Customer Address(es)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInputText(SAMPLE_SINGLE)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 transition-colors"
                  >
                    Paste Single Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputText(SAMPLE_BULK)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 transition-colors"
                  >
                    Paste Bulk Sample (3x)
                  </button>
                  {inputText && (
                    <button
                      type="button"
                      onClick={() => setInputText('')}
                      className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={11}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Paste single or bulk orders here in standard format:\n\nTO,\nRahul Sharma\nFlat 402, Sunshine Apartments, Indiranagar, Bangalore, Karnataka - 560038\n9876543210\n\nTO,\nPooja Patel\nB-201, Green Heights, SG Highway, Ahmedabad, Gujarat 380015\n9123456789`}
                className="w-full p-4 rounded-xl border border-slate-300 font-mono text-sm bg-white text-slate-900 shadow-inner outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all leading-relaxed"
              />

              {/* Quick Format Guidelines */}
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-4 text-xs text-slate-700 flex flex-col gap-1.5">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Supported Format Rules:
                </span>
                <p className="text-slate-600">
                  • <strong>Single Order</strong>: Paste Name, Address (with 6-digit PIN code), and 10-digit Phone Number.
                </p>
                <p className="text-slate-600">
                  • <strong>Bulk Orders</strong>: Separate each order with <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-700">TO,</code> or a blank line.
                </p>
                <p className="text-slate-600">
                  • <strong>Fulfillment Auto-Routing</strong>: If the PIN is serviceable by Innofulfill, an Innofulfill order with real AWB is created. Otherwise, it is pushed to Shiprocket dashboard.
                </p>
              </div>

              {items.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium text-slate-600">
                    Detected <strong>{items.length}</strong> order{items.length > 1 ? 's' : ''} ({validCount} valid)
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all"
                  >
                    Proceed to Review <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REVIEW & EDIT */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  Review & Customize Orders ({items.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddNewManual}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Order
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No orders parsed yet</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Paste text in Step 1 or create an entry manually.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('input')}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                  >
                    Go to Paste Input
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`p-4 rounded-xl border bg-white shadow-sm transition-all ${
                        item.isValid
                          ? 'border-slate-200 hover:border-blue-300'
                          : 'border-rose-300 bg-rose-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {item.name || 'Unnamed Customer'}
                          </span>
                          {item.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3" /> Incomplete
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Validation Error Notices */}
                      {!item.isValid && item.validationErrors.length > 0 && (
                        <div className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
                          {item.validationErrors.join(' • ')}
                        </div>
                      )}

                      {/* Editable Form Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Name */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Customer Name *
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                            placeholder="Full Name"
                          />
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Phone Number (10 digits) *
                          </label>
                          <input
                            type="text"
                            value={item.phone}
                            onChange={(e) => handleUpdateItem(idx, 'phone', e.target.value.replace(/\D/g, '').slice(-10))}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                            placeholder="9876543210"
                          />
                        </div>

                        {/* Pincode & State */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              PIN Code *
                            </label>
                            <input
                              type="text"
                              value={item.pincode}
                              maxLength={6}
                              onChange={(e) => handleUpdateItem(idx, 'pincode', e.target.value.replace(/\D/g, ''))}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none font-mono"
                              placeholder="560001"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              State
                            </label>
                            <select
                              value={item.state}
                              onChange={(e) => handleUpdateItem(idx, 'state', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white"
                            >
                              {ALL_REGION_NAMES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Delivery Address *
                          </label>
                          <input
                            type="text"
                            value={item.address}
                            onChange={(e) => handleUpdateItem(idx, 'address', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                            placeholder="Flat/House, Street, Area, Landmark"
                          />
                        </div>

                        {/* Price & Payment */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Price (₹)
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateItem(idx, 'price', 1000)}
                                className={`flex-1 py-1 text-[11px] font-bold rounded ${
                                  item.price === 1000
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                1k
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateItem(idx, 'price', 3000)}
                                className={`flex-1 py-1 text-[11px] font-bold rounded ${
                                  item.price === 3000
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                3k
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Payment
                            </label>
                            <select
                              value={item.paymentMethod}
                              onChange={(e) => handleUpdateItem(idx, 'paymentMethod', e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white font-semibold"
                            >
                              <option value="prepay">Prepaid</option>
                              <option value="cod">COD</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESULTS SUMMARY */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              {submitting ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
                  <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                  <h3 className="text-base font-bold text-slate-900">Creating Orders & Routing Shipping...</h3>
                  <p className="text-xs text-slate-500 mt-1">{progressMsg}</p>
                </div>
              ) : apiError ? (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800">
                  <div className="flex items-center gap-2 font-bold mb-2">
                    <AlertCircle className="w-5 h-5 text-rose-600" /> Order Creation Error
                  </div>
                  <p className="text-xs leading-relaxed">{apiError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className="mt-4 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                  >
                    Return to Review
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900">
                          Batch Processed: {results.filter((r) => r.success).length} of {results.length} Succeeded
                        </h4>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Orders saved in Airtable and booked with courier partners.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Order ID</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">PIN Code</th>
                          <th className="py-3 px-4">Routed Courier</th>
                          <th className="py-3 px-4">AWB / Booking ID</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {results.map((res, i) => (
                          <tr key={res.orderId || i} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {res.orderId || '—'}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800">
                              {res.name}
                              <div className="text-[11px] text-slate-400">{res.phone}</div>
                            </td>
                            <td className="py-3 px-4 font-mono">{res.pincode}</td>
                            <td className="py-3 px-4">
                              {res.provider === 'Innofulfill' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                                  <Truck className="w-3 h-3 text-blue-600" /> Innofulfill (Express)
                                </span>
                              ) : res.provider === 'Shiprocket' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                                  <Truck className="w-3 h-3 text-amber-600" /> Shiprocket Dashboard
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-900">
                              {res.awbNumber ? (
                                <span className="font-bold text-emerald-700">{res.awbNumber}</span>
                              ) : res.innofulfillOrderId ? (
                                <span className="text-slate-600">ID: {res.innofulfillOrderId}</span>
                              ) : (
                                <span className="text-slate-400">Assigned in Dashboard</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {res.success ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Created
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-600 font-semibold" title={res.error}>
                                  <AlertCircle className="w-3.5 h-3.5" /> {res.error || 'Failed'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <a
                      href="https://app.shiprocket.in/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open Shiprocket Dashboard
                    </a>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setInputText('');
                          setResults([]);
                          setActiveTab('input');
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all"
                      >
                        Create More Orders
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-sm transition-all"
                      >
                        Done & Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
          >
            Cancel
          </button>

          {activeTab !== 'results' && (
            <div className="flex items-center gap-3">
              {activeTab === 'input' && items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
                >
                  Review {items.length} Order{items.length > 1 ? 's' : ''} <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {activeTab === 'preview' && (
                <button
                  type="button"
                  disabled={validCount === 0 || submitting}
                  onClick={handleCreateOrders}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Creating Orders...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Create {validCount} Order{validCount > 1 ? 's' : ''} & Route Logistics
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
