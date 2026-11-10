import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodTypeAny, ZodType, ZodIssue } from 'zod';
import { ValidationError } from '../errors/ValidationError';

export interface RequestValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Middleware factory for validating incoming HTTP request components against Zod schemas.
 *
 * @param schemas - Validation schemas object or standalone Zod schema
 * @param defaultTarget - Target property to validate when a standalone schema is passed ('body', 'query', or 'params')
 * @returns Express middleware function
 */
export const validate = (
  schemas: RequestValidationSchemas | ZodTypeAny,
  defaultTarget: 'body' | 'query' | 'params' = 'body',
): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const allIssues: ZodIssue[] = [];

      if (schemas instanceof ZodType) {
        const parsed = await schemas.safeParseAsync(req[defaultTarget]);
        if (!parsed.success) {
          allIssues.push(...parsed.error.issues);
        } else {
          req[defaultTarget] = parsed.data;
        }
      } else {
        if (schemas.params) {
          const parsedParams = await schemas.params.safeParseAsync(req.params);
          if (!parsedParams.success) {
            allIssues.push(...parsedParams.error.issues);
          } else {
            req.params = parsedParams.data;
          }
        }

        if (schemas.query) {
          const parsedQuery = await schemas.query.safeParseAsync(req.query);
          if (!parsedQuery.success) {
            allIssues.push(...parsedQuery.error.issues);
          } else {
            req.query = parsedQuery.data;
          }
        }

        if (schemas.body) {
          const parsedBody = await schemas.body.safeParseAsync(req.body);
          if (!parsedBody.success) {
            allIssues.push(...parsedBody.error.issues);
          } else {
            req.body = parsedBody.data;
          }
        }
      }

      if (allIssues.length > 0) {
        return next(new ValidationError('Validation failed', allIssues));
      }

      next();
    } catch (err: unknown) {
      next(err);
    }
  };
};

/**
 * Convenience helper for validating request body.
 *
 * @param schema - Zod schema for request body
 * @returns Express middleware function
 */
export const validateBody = (schema: ZodTypeAny): RequestHandler => validate(schema, 'body');

/**
 * Convenience helper for validating request query parameters.
 *
 * @param schema - Zod schema for request query
 * @returns Express middleware function
 */
export const validateQuery = (schema: ZodTypeAny): RequestHandler => validate(schema, 'query');

/**
 * Convenience helper for validating request route parameters.
 *
 * @param schema - Zod schema for request params
 * @returns Express middleware function
 */
export const validateParams = (schema: ZodTypeAny): RequestHandler => validate(schema, 'params');
