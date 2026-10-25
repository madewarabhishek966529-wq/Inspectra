import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { BrowserWorkerExecutor } from './executor.js';
import { ExecutionEventPayload, RunConfig, WorkerRunReport } from './types.js';

const app = express();
const PORT = process.env.PORT || 5001;
const ARTIFACTS_ROOT = path.resolve(process.cwd(), 'artifacts');
fs.mkdirSync(ARTIFACTS_ROOT, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/artifacts', express.static(ARTIFACTS_ROOT));

const executor = new BrowserWorkerExecutor();
const runReports = new Map<string, WorkerRunReport>();
const runEvents = new Map<string, ExecutionEventPayload[]>();
const sseClients = new Map<string, Set<Response>>();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Inspectra Browser Automation Worker',
    browser: 'Chromium (Playwright)',
    timestamp: new Date().toISOString()
  });
});

// SSE Stream for a specific run
app.get('/api/worker/runs/:runId/events', (req: Request, res: Response) => {
  const { runId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send historical events for this run
  const history = runEvents.get(runId) || [];
  for (const ev of history) {
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  }

  // If run is already completed, finish stream immediately
  if (runReports.has(runId)) {
    res.end();
    return;
  }

  if (!sseClients.has(runId)) {
    sseClients.set(runId, new Set());
  }
  sseClients.get(runId)!.add(res);

  req.on('close', () => {
    sseClients.get(runId)?.delete(res);
  });
});

// Start a test run execution
app.post('/api/worker/execute', async (req: Request, res: Response) => {
  const config: RunConfig = req.body;
  if (!config.runId || !config.targetUrl) {
    res.status(400).json({ error: 'Missing runId or targetUrl' });
    return;
  }

  runEvents.set(config.runId, []);

  // Return 202 Accepted immediately so caller is not blocked
  res.status(202).json({
    message: 'Test execution initiated',
    runId: config.runId,
    targetUrl: config.targetUrl,
    eventsUrl: `/api/worker/runs/${config.runId}/events`
  });

  // Execute asynchronously
  try {
    const report = await executor.executeRun(config, (event: ExecutionEventPayload) => {
      // Store event
      if (!runEvents.has(config.runId)) {
        runEvents.set(config.runId, []);
      }
      runEvents.get(config.runId)!.push(event);

      // Broadcast to connected SSE subscribers
      const clients = sseClients.get(config.runId);
      if (clients) {
        for (const client of clients) {
          try {
            client.write(`data: ${JSON.stringify(event)}\n\n`);
          } catch {}
        }
      }
    });

    runReports.set(config.runId, report);
  } catch (err: any) {
    console.error(`[Worker Error] Run ${config.runId} failed:`, err);
  } finally {
    // Terminate SSE client connections cleanly upon run completion
    const clients = sseClients.get(config.runId);
    if (clients) {
      for (const client of clients) {
        try {
          client.end();
        } catch {}
      }
      sseClients.delete(config.runId);
    }
  }
});


// Get run status and report
app.get('/api/worker/runs/:runId/status', (req: Request, res: Response) => {
  const { runId } = req.params;
  const report = runReports.get(runId);
  const events = runEvents.get(runId) || [];

  if (report) {
    res.json({
      status: report.status,
      completed: true,
      report,
      eventsCount: events.length
    });
    return;
  }

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;
  res.json({
    status: latestEvent?.step || 'QUEUED',
    completed: false,
    latestEvent,
    eventsCount: events.length
  });
});

// Cancel run
app.post('/api/worker/cancel', (req: Request, res: Response) => {
  const { runId } = req.body;
  if (!runId) {
    res.status(400).json({ error: 'Missing runId' });
    return;
  }

  const success = executor.cancelRun(runId);
  res.json({ success, message: success ? 'Cancellation signaled to browser' : 'Run was not active' });
});

app.listen(PORT, () => {
  console.log(`[Inspectra Worker] Automation worker running on http://localhost:${PORT}`);
});
