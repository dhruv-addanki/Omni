import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualEnd?: string;
}

export default function DailyDetailPage() {
  const router = useRouter();
  const { date } = router.query as { date?: string };
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [reflection, setReflection] = useState<{ rating: number; notes: string; aiSummary?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    const load = async () => {
      setLoading(true);
      try {
        const [taskRes, reflectionRes] = await Promise.all([
          api.getTasksForDate(date),
          api.getReflection(date)
        ]);
        setTasks(taskRes.tasks || []);
        setReflection(reflectionRes);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [date]);

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Day Detail</h1>
          <p className="text-slate-600">{date}</p>
        </div>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && (
          <>
            <div className="bg-white border border-slate-200 rounded p-4">
              <h3 className="font-semibold mb-2">Tasks</h3>
              <div className="flex flex-col gap-2">
                {tasks.map((t) => (
                  <div key={t.id} className="border border-slate-100 rounded p-2">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-slate-600 text-sm">Status: {t.status}</div>
                  </div>
                ))}
                {tasks.length === 0 && <div className="text-slate-400">No tasks for this day.</div>}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded p-4">
              <h3 className="font-semibold mb-2">Reflection</h3>
              {reflection ? (
                <>
                  <div className="text-slate-700">Rating: {reflection.rating}</div>
                  <div className="text-slate-700">Notes: {reflection.notes || 'None'}</div>
                  <div className="text-slate-700 mt-2">AI Summary: {reflection.aiSummary || 'None'}</div>
                </>
              ) : (
                <div className="text-slate-400">No reflection for this day.</div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
