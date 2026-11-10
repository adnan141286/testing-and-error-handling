import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../src/utils/asyncHandler';

describe('asyncHandler Utility', (): void => {
  it('should call the wrapped handler with req, res, next and resolve successfully', async (): Promise<void> => {
    let executed = false;
    const mockHandler = async (
      _req: Request,
      _res: Response,
      _next: NextFunction,
    ): Promise<void> => {
      executed = true;
    };

    const wrapped = asyncHandler(mockHandler);
    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = jest.fn() as NextFunction;

    wrapped(mockReq, mockRes, mockNext);
    await Promise.resolve();

    expect(executed).toBe(true);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should catch rejected promises and forward error to next()', async (): Promise<void> => {
    const testError = new Error('Async failure test');
    const mockHandler = async (): Promise<void> => {
      throw testError;
    };

    const wrapped = asyncHandler(mockHandler);
    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = jest.fn() as NextFunction;

    wrapped(mockReq, mockRes, mockNext);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockNext).toHaveBeenCalledWith(testError);
  });
});
