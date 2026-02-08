import httpStatus from "http-status";
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import { tokenService } from "../token";
import { userService } from "../user";
import * as authService from "./auth.service";
import { emailService } from "../email";
import AppiError from "../errors/ApiError";

export const register = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.registerUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

export const loginWithGoogle = catchAsync(
  async (req: Request, res: Response) => {
    const user = await userService.loginWithGoogle(req.body);
    console.log("Google login user:", user);
    const tokens = await tokenService.generateAuthTokens(user);
    res.status(httpStatus.CREATED).send({ user, tokens });
  }
);

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

export const refreshTokens = catchAsync(async (req: Request, res: Response) => {
  const userWithTokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...userWithTokens });
});

export const forgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    const resetPasswordToken = await tokenService.generateResetPasswordToken(
      req.body.email
    );
    await emailService.sendResetPasswordEmail(
      req.body.email,
      resetPasswordToken
    );
    res.status(httpStatus.OK).send({
      message: "Reset password email sent successfully",
    });
  }
);

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  await authService.resetPassword(req.query["token"], req.body.password);
  res.status(httpStatus.OK).send({
    message: "Password reset successfully",
  });
});

export const sendVerificationEmail = catchAsync(
  async (req: Request, res: Response) => {
    const verifyEmailToken = await tokenService.generateVerifyEmailToken(
      req.user
    );
    await emailService.sendVerificationEmail(
      req.user.email,
      verifyEmailToken,
      req.user.name
    );
    res.status(httpStatus.OK).send({
      message: "Verification email sent successfully",
    });
  }
);

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.query["token"]);
  res.status(httpStatus.OK).send({
    message: "Email verified successfully",
  });
});

export const AcceptInvitation = catchAsync(
  async (req: Request, res: Response) => {
    const user = await authService.AcceptInvitation(req.body);
    const tokens = await tokenService.generateAuthTokens(user);
    res.status(httpStatus.CREATED).send({ user, tokens });
  }
);

export const updatePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { password, oldPassword } = req.body;
    const { user } = req;

    if (!password || !oldPassword) {
      const fieldErrors = {
        password: password ? undefined : "Password is required.",
        oldPassword: oldPassword ? undefined : "Old Password is required.",
      };
      return next(new AppiError("Validation failed", 400, fieldErrors));
    }

    if (!user) {
      return next(
        new AppiError("user not found", 404, { user: "user not found" })
      );
    }

    // check if the old password is equal to stored password(correct old password)
    if (!(await user.isPasswordMatch(oldPassword))) {
      const fieldErrors = {
        oldPassword: "Provided old password is incorrect",
      };
      return next(new AppiError("Validation failed", 400, fieldErrors));
    }

    // new password must not be equal to old password
    if (await user.isPasswordMatch(password)) {
      const fieldErrors = {
        password: "Your new password must be different from the current one.",
      };
      return next(new AppiError("Validation failed", 400, fieldErrors));
    }

    user.password = password;

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      status: "success",
      data: { email: user.email },
      message: "Password updated Successfully",
    });
  }
);
