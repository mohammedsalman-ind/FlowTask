import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Generic Zod validation middleware factory.
 *
 * Creates an Express middleware that validates req.body against the
 * provided Zod schema. On validation failure, returns a structured
 * error response with details about each invalid field.
 *
 * @param schema - A Zod schema to validate the request body against.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * const createTaskSchema = z.object({ title: z.string().min(1) });
 * router.post('/tasks', validate(createTaskSchema), createTaskHandler);
 * ```
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body);
      // Replace body with the parsed (and potentially transformed) data
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(400).json({
          data: null,
          error: 'Validation failed',
          status: 400,
          details: fieldErrors,
        });
        return;
      }

      // Unexpected error — rethrow
      next(err);
    }
  };
}
