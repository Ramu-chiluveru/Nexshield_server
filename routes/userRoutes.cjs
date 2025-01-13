const express = require("express");
const Router = express.Router();
const { loginController, registerController, fetchAllUsersController, addKeywordsController, editUserController, getKeywordsController } = require("../controllers/userController.cjs");

Router.post('/login', loginController);
Router.post('/register', registerController);
Router.post('/addkeywords', addKeywordsController);
Router.post('/edituser', editUserController);
Router.get('/getkeywords/:userId', getKeywordsController); 
module.exports = Router;
