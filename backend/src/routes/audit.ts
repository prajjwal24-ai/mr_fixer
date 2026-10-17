import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { loadPageSecurely } from '../scanner/pageLoader.js';
import { runAudit, runRescan } from '../scanner/engine.js';
import { AppError } from '../middleware/errorHandler.js';

export const auditRouter = Router();

const auditRequestSchema = z.object({
  url: z.string({ required_error: 'URL is required' }).trim().min(1, 'URL cannot be empty'),
});

const rescanRequestSchema = z.object({
  url: z.string({ required_error: 'URL is required' }).trim().min(1, 'URL cannot be empty'),
  previousFingerprints: z.array(z.string()).optional().default([]),
});

/**
 * POST /api/audit/validate
 * Ingestion and verification foundation: safely loads a single webpage and returns metadata.
 */
auditRouter.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = auditRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw new AppError(400, 'INVALID_REQUEST', issue ? issue.message : 'Invalid request payload.');
    }

    const { url } = parseResult.data;
    const metadata = await loadPageSecurely(url);

    res.status(200).json({
      success: true,
      data: metadata,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Core handler for full deterministic audit
 */
export async function handleAuditRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = auditRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw new AppError(400, 'INVALID_REQUEST', issue ? issue.message : 'Invalid request payload.');
    }

    const { url } = parseResult.data;
    const report = await runAudit(url);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Core handler for rescan-based verification
 */
export async function handleRescanRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = rescanRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw new AppError(400, 'INVALID_REQUEST', issue ? issue.message : 'Invalid request payload.');
    }

    const { url, previousFingerprints } = parseResult.data;
    const rescanReport = await runRescan(url, previousFingerprints);

    res.status(200).json({
      success: true,
      data: rescanReport,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/audit -> executes full deterministic audit
auditRouter.post('/', handleAuditRequest);

// POST /api/audit/rescan -> executes rescan
auditRouter.post('/rescan', handleRescanRequest);
