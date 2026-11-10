import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Type representing an asynchronous Express request handler returning a Promise.
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Wraps an asynchronous Express route handler or middleware to catch rejected promises
 * and pass any caught error to Express next() error handler.
 *
 * @param fn - The asynchronous request handler function
 * @returns Standard Express synchronous RequestHandler
 */
export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
