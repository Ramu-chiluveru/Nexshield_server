const express = require("express");
const Router = express.Router();
const { loginController, registerController, fetchAllUsersController } = require("../controllers/userController.cjs");
const protect = require("../middleWare/authMiddleware.cjs");

Router.post('/login',loginController);
Router.post('/register',registerController);

module.exports = Router;