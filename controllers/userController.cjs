const express = require("express");
const userModel = require("../models/userModel.cjs");
const expressAsyncHandler = require("express-async-handler");
const generateToken = require("../config/generateToken.cjs");

const jsonMiddleware = express.json();

const loginController = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email });

  if (user && user.password == password) { 

    const response = {
      _id: user._id,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id)
    }
    res.status(200).json(response);
  } else {
    res.status(401).json({ message: "Invalid username or password" });
  }
});

const registerController = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(404).json({ message: "All necessary input fields have not been filled" });
    return;
  }

  const emailExist = await userModel.findOne({ email });
  if (emailExist) {
    res.status(405).json({ message: "User already exists with this email" });
    return;
  }

  const userEmailExist = await userModel.findOne({ email });
  if (userEmailExist) {
    res.status(406).json({ message: "Username already exists" });
    return;
  }

  const user = await userModel.create({ email, password });

  if (user) {
    console.log("user created: " + user);
    
    res.status(201).json({
      _id: user._id,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id)
    });
  } else {
    res.status(400).json({ message: "Registration failed" });
  }
});


const fetchAllUsersController = expressAsyncHandler(async(req,res)=>{
  const keyword = req.query.search
  ?{
    $or:[
      {name:{$regex: req.query.search,$options:"i"}},
      {email:{$regex: req.query.search,$options:"i"}},
    ],
  }:{};

  const users = await userModel.find(keyword).find({_id:{$ne:req.user._id},});
  res.send(users);
});

module.exports = { loginController, registerController,fetchAllUsersController };