import { Request, Response, NextFunction } from 'express';

/**
 * Creates a CORS middleware configured with the specified allowed origin.
 * Handles preflight OPTIONS requests as well as standard CORS headers.
 *
 * @param allowedOrigin - Origin allowed to access API resources
 * @returns Express middleware function
 */
export const createCorsMiddleware = (
  allowedOrigin: string,
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
};
