import { useEffect, useState } from 'react';

interface PlanningDay {
  date: string;
  tasks: any[];
  focusBlocks: any[];
  events: any[];
}

async function fetchDay(date: string): Promise<PlanningDay> {
  const res = await fetch(`/planning/day?date=${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function PlanningBoardPage() {
  const [todayData, setTodayData] = useState<PlanningDay | null>(null);
  const [tomorrowData, setTomorrowData] = useState<PlanningDay | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const toIso = (d: Date) => d.toISOString().split('T')[0];
    Promise.all([fetchDay(toIso(today)), fetchDay(toIso(tomorrow))])
      .then(([t, tm]) => {
        setTodayData(t);
        setTomorrowData(tm);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Planning board</h1>
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DayColumn title="Today" data={todayData} />
        <DayColumn title="Tomorrow" data={tomorrowData} />
      </div>
      <p className="text-sm text-slate-500">
        Drag-and-drop not fully implemented here; backend supports PATCH /planning/day for updates.
      </p>
    </main>
  );
}

function DayColumn({ title, data }: { title: string; data: PlanningDay | null }) {
  if (!data) return <div className="border border-slate-200 rounded p-4">Loading {title}…</div>;
  return (
    <div className="border border-slate-200 rounded p-4 space-y-3">
      <h3 className="font-semibold">{title}</h3>
      <div>
        <h4 className="text-sm font-semibold">Tasks</h4>
        <ul className="text-sm text-slate-700 space-y-1">
          {data.tasks.map((t) => (
            <li key={t.id}>{t.title}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-semibold">Focus blocks</h4>
        <ul className="text-sm text-slate-700 space-y-1">
          {data.focusBlocks.map((b) => (
            <li key={b.id}>
              {new Date(b.plannedStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
              {new Date(b.plannedEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({b.taskId || 'Unassigned'})
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-semibold">Calendar events</h4>
        <ul className="text-sm text-slate-700 space-y-1">
          {data.events.map((e) => (
            <li key={e.id}>
              {e.title} ({new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
