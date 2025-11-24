import Link from 'next/link';

export default function DashboardPage() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/planning" className="block border border-slate-200 rounded p-4 hover:shadow-sm">
          <h3 className="font-semibold mb-2">Planning board</h3>
          <p className="text-slate-600">Adjust today/tomorrow plan and focus blocks.</p>
        </Link>
        <Link href="/dashboard/review" className="block border border-slate-200 rounded p-4 hover:shadow-sm">
          <h3 className="font-semibold mb-2">Review & AI</h3>
          <p className="text-slate-600">Reflections, AI summaries, critiques, and deviations.</p>
        </Link>
        <Link href="/settings" className="block border border-slate-200 rounded p-4 hover:shadow-sm">
          <h3 className="font-semibold mb-2">Settings</h3>
          <p className="text-slate-600">Integrations, notifications, alarm rules.</p>
        </Link>
      </div>
    </main>
  );
}
