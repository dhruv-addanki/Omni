import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function ReviewPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getReviewDay(selectedDate)
      .then((d) => setData(d))
      .catch((err) => setError(err.message));
  }, [selectedDate]);

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Review</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-slate-200 rounded px-2 py-1"
        />
      </div>
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded p-4 space-y-2">
          <h3 className="font-semibold">Reflection</h3>
          <p className="text-slate-700">{data?.reflection?.notes || 'No reflection'}</p>
          <p className="text-slate-500">Rating: {data?.reflection?.rating ?? 'N/A'}</p>
          <h4 className="font-semibold mt-2">AI summary</h4>
          <p className="text-slate-700">{data?.reflection?.aiSummary || 'No AI summary'}</p>
        </div>
        <div className="border border-slate-200 rounded p-4 space-y-2">
          <h3 className="font-semibold">Plan critique</h3>
          <p className="text-slate-700">{data?.planCritique?.critique || 'No critique'}</p>
          <h3 className="font-semibold mt-4">Deviation</h3>
          <p className="text-slate-700">
            Focus delta: {data?.deviation?.deltaFocusMinutes}m | Tasks delta: {data?.deviation?.deltaTasksCount}
          </p>
        </div>
      </div>
    </main>
  );
}
