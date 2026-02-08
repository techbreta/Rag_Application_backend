import express, { Router } from "express";
import { validate } from "../../modules/validate";
import { auth } from "../../modules/auth";
import { userController, userValidation } from "../../modules/user";

const router: Router = express.Router();

router
  .route("/")
  .post(
    auth("manageUsers"),
    validate(userValidation.createUser),
    userController.createUser
  )
  .get(
    auth("manageUsers"),
    validate(userValidation.getUsers),
    userController.getAllUsers
  );


router
  .route("/me")
  .get(auth(), userController.getMe)
  .patch(auth(), userController.updateMe);

router
  .route("/:userId")
  .get(
    auth("manageUsers"),
    validate(userValidation.getUser),
    userController.getUser
  )
  .patch(
    auth("manageUsers"),
    validate(userValidation.updateUser),
    userController.updateUser
  )
  .delete(
    auth("manageUsers"),
    validate(userValidation.deleteUser),
    userController.deleteUser
  );



export default router;
