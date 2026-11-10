import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export interface CoverageMetric {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

export interface CoverageSummaryData {
  total: {
    lines: CoverageMetric;
    statements: CoverageMetric;
    functions: CoverageMetric;
    branches: CoverageMetric;
  };
}

/**
 * Creates and configures the Test Coverage Report Express router.
 *
 * @returns Configured Express router
 */
export const createCoverageRouter = (): Router => {
  const router = Router();

  router.get('/', (_req: Request, res: Response): void => {
    const candidatePaths = [
      path.resolve(process.cwd(), 'coverage/coverage-summary.json'),
      path.resolve(process.cwd(), 'backend/coverage/coverage-summary.json'),
      path.resolve(__dirname, '../../coverage/coverage-summary.json'),
      '/app/coverage/coverage-summary.json',
    ];

    let foundPath: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      res.status(200).json({
        available: false,
        threshold: 85,
        message: 'Run npm run test:coverage first',
      });
      return;
    }

    try {
      const raw = fs.readFileSync(foundPath, 'utf-8');
      const data = JSON.parse(raw) as CoverageSummaryData;
      res.status(200).json({
        available: true,
        threshold: 85,
        metrics: data.total,
      });
    } catch {
      res.status(200).json({
        available: false,
        threshold: 85,
        message: 'Error reading coverage summary file',
      });
    }
  });

  return router;
};
