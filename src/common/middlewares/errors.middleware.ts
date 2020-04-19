import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err, req: Request, res: Response, next: NextFunction) => {
   res.statusCode = err.statusCode;
   res.send(err);
};
