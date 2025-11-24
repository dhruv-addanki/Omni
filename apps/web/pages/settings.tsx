import { useEffect, useState } from 'react';

async function fetchSettings() {
  const res = await fetch('/settings');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function saveSettings(body: any) {
  const res = await fetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function fetchIntegrations() {
  const res = await fetch('/integrations');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchIntegrations()])
      .then(([s, i]) => {
        setSettings(s);
        setIntegrations(i);
      })
      .catch((err) => setError(err.message));
  }, []);

  const updateNotifications = async (field: string, value: boolean) => {
    try {
      const updated = await saveSettings({ notifications: { ...(settings?.notifications || {}), [field]: value } });
      setSettings(updated);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded p-4 space-y-2">
          <h3 className="font-semibold">Notifications</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!settings?.notifications?.reflectionReminder}
              onChange={(e) => updateNotifications('reflectionReminder', e.target.checked)}
            />
            Reflection reminders
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!settings?.notifications?.focusOffTrack}
              onChange={(e) => updateNotifications('focusOffTrack', e.target.checked)}
            />
            Focus off-track alerts
          </label>
        </div>
        <div className="border border-slate-200 rounded p-4 space-y-2">
          <h3 className="font-semibold">Integrations</h3>
          <ul className="text-sm text-slate-700 space-y-1">
            {integrations.map((c) => (
              <li key={c.id}>{c.provider}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">Connect/disconnect flows are stubbed.</p>
        </div>
      </div>
    </main>
  );
}
