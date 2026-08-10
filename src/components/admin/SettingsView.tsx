import { useState } from 'react';
import { Save, Bell, Shield, Store, Truck, Check } from 'lucide-react';

export function SettingsView() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    storeName: 'RetraLabs',
    supportEmail: 'support@retralabs.com',
    supportPhone: '+91 98765 43210',
    autoRefresh: true,
    refreshInterval: '60',
    codEnabled: true,
    expressEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const sections = [
    {
      icon: Store,
      title: 'Store Information',
      fields: [
        { key: 'storeName', label: 'Store Name', type: 'text' },
        { key: 'supportEmail', label: 'Support Email', type: 'text' },
        { key: 'supportPhone', label: 'Support Phone', type: 'text' },
      ],
    },
    {
      icon: Truck,
      title: 'Delivery Options',
      toggles: [
        { key: 'codEnabled', label: 'Cash on Delivery (COD)' },
        { key: 'expressEnabled', label: 'Express Delivery' },
      ],
    },
    {
      icon: Bell,
      title: 'Notifications',
      toggles: [
        { key: 'emailNotifications', label: 'Email notifications for new orders' },
        { key: 'smsNotifications', label: 'SMS notifications for new orders' },
      ],
    },
    {
      icon: Shield,
      title: 'Dashboard Preferences',
      fields: [
        { key: 'refreshInterval', label: 'Auto-refresh interval (seconds)', type: 'text' },
      ],
      toggles: [
        { key: 'autoRefresh', label: 'Auto-refresh order data' },
      ],
    },
  ];

  return (
    <div className="max-w-2xl space-y-4">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.title} className="bg-white rounded-2xl border border-slate-200/80 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Icon className="w-4 h-4 text-slate-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">{section.title}</h2>
            </div>

            {section.fields && (
              <div className="space-y-3">
                {section.fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                    <input
                      type="text"
                      value={(settings as Record<string, unknown>)[f.key] as string}
                      onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>
                ))}
              </div>
            )}

            {section.toggles && (
              <div className="space-y-3">
                {section.toggles.map((t) => (
                  <label key={t.key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-slate-700">{t.label}</span>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, [t.key]: !(settings as Record<string, boolean>)[t.key] })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${(settings as Record<string, boolean>)[t.key] ? 'bg-blue-500' : 'bg-slate-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${(settings as Record<string, boolean>)[t.key] ? 'translate-x-5' : ''}`} />
                    </button>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={handleSave}
        className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all ${
          saved ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
