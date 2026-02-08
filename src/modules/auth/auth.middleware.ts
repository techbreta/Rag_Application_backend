import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import httpStatus from 'http-status';
import ApiError from '../errors/ApiError';
import { roleRights } from '../../config/roles';
import { IUserDoc } from '../user/user.interfaces';


const verifyCallback =
  (req: Request, resolve: any, reject: any, requiredRights: string[]) =>
  async (err: Error, user: IUserDoc, info: string) => {
    console.log('Authentication attempt:', req.headers.authorization);
    console.log('required rights', requiredRights);

    if (err || info || !user) {
      return reject(new ApiError('Please authenticate', httpStatus.UNAUTHORIZED));
    }
    req.user = user;
    
    if (requiredRights.length) {
      const userRights = roleRights.get(user.role as string);
      const hasRequiredRights = requiredRights.every((right) => userRights?.includes(right));
      if (!hasRequiredRights) {
        return reject(new ApiError('You do not have permission to perform this action', httpStatus.FORBIDDEN));
      }
    }
    
  

    resolve();
  };

const authMiddleware =
  (...requiredRights: string[]) =>
  async (req: Request, res: Response, next: NextFunction) =>
    new Promise<void>((resolve, reject) => {
      // console.log("Auth middleware triggered", req.headers, ".................headers");
      passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
    })
      .then(() => next())
      .catch((err) => next(err));

export default authMiddleware;
