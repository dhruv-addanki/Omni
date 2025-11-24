import { Router } from 'express';
import { runPendingJobs } from '../services/jobRunner';

const router = Router();
router.post('/run-jobs', async (_req, res) => {
  const results = await runPendingJobs(5);
  return res.json({ processed: results.length, results });
});

export default router;
