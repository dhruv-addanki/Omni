import 'dotenv/config';
import express from 'express';
import tasksRouter from './routes/tasks';
import userRouter from './routes/user';
import reflectionsRouter from './routes/reflections';
import alarmsRouter from './routes/alarms';
import dayPlanRouter from './routes/dayPlan';
import cronRouter from './routes/cron';
import analyticsRouter from './routes/analytics';
import planningRouter from './routes/planning';
import screenTimeRouter from './routes/screenTime';
import focusBlocksRouter from './routes/focusBlocks';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/tasks', tasksRouter);
app.use('/reflections', reflectionsRouter);
app.use('/alarms', alarmsRouter);
app.use('/day-plan', dayPlanRouter);
app.use('/cron', cronRouter);
app.use('/analytics', analyticsRouter);
app.use('/planning', planningRouter);
app.use('/screen-time', screenTimeRouter);
app.use('/focus-blocks', focusBlocksRouter);
app.use(userRouter);

// Simple error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${port}`);
});
