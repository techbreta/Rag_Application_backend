import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as userService from './user.service';

export const createUser = catchAsync(async (req: Request, res: Response) => {
  let ownerId: mongoose.Types.ObjectId;
  
  if (req.user.role !== "admin") {
    ownerId = req.user._id;
  } else {
    // For admin users, they might pass ownerId in the request body or use their own ID
    ownerId = req.body.ownerId ? new mongoose.Types.ObjectId(req.body.ownerId) : req.user._id;
  }
   

  console.log("Creating user with body:", req.body);
  const user = await userService.createUser({ 
    ...req.body, 
    createdBy: req.user._id, 
    ownerId 
  });

  res.status(httpStatus.CREATED).send(user);
});

export const getUsers = catchAsync(async (req: Request, res: Response) => {
  // Authorization logic
  if (req.user && req.user.role === 'admin') {
    // Admin can see users they created
  } else if (req.user && req.user.role === 'sub-admin') {
    // Sub-admin can see users created by their admin
  } else {
    throw new Error("Unauthorized");
  }
  
  const filter = pick(req.query, ['name', 'role']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

 export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, role, search } = req.query;
  
  // Authorization logic
  if (req.user && req.user.role === 'admin') {
    // Admin can see users they created
  } else if (req.user && req.user.role === 'sub-admin') {
    // Sub-admin can see users created by their admin
  } else {
    throw new Error("Unauthorized");
  }
  
  const queryParams: {
    page: number;
    limit: number;
    role?: string;
    search?:string;
    userId?: mongoose.Types.ObjectId;
  } = {
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    search: search as string,
  };
  
  if (role) {
    queryParams.role = role as string;
  }
  
  // if (req.user._id) {
  //   queryParams.userId = req.user._id;
  // }
  
  const data = await userService.getUsers(queryParams);
  res.send(data);
});

export const getUser = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['userId'] === 'string') {
    const user = await userService.getUserById(new mongoose.Types.ObjectId(req.params['userId']));
    if (!user) {
      throw new ApiError('User not found', httpStatus.NOT_FOUND);
    }
    res.send(user);
  }
});

export const updateUser = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['userId'] === 'string') {
    const user = await userService.updateUserById(new mongoose.Types.ObjectId(req.params['userId']), req.body);
    if (!user) {
      throw new ApiError('User not found', httpStatus.NOT_FOUND);
    }
    res.send(user);
  }
});
export const updateMe = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.updateUserById(req.user._id, req.body);
  if (!user) {
    throw new ApiError('User not found', httpStatus.NOT_FOUND);
  }
  res.send(user);
});

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['userId'] === 'string') {
    const user = await userService.deleteUserById(new mongoose.Types.ObjectId(req.params['userId']));
    if (!user) {
      throw new ApiError('User not found', httpStatus.NOT_FOUND);
    }
    res.status(httpStatus.NO_CONTENT).send();
  }
});


  

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id; 
  const user = await userService.getme(userId);

  console.log(user.role, 'User role');

  res.send({ user });
});
