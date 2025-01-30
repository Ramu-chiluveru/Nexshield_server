const express = require("express");
const userModel = require("../models/userModel.cjs");
const expressAsyncHandler = require("express-async-handler");
const generateToken = require("../config/generateToken.cjs");
const bcrypt = require('bcryptjs');  
const jsonMiddleware = express.json();

const loginController = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await userModel.findOne({ email });

  if (user && await bcrypt.compare(password, user.password)) {
    const response = {
      _id: user._id,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id), 
    };
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

  const user = await userModel.create({ email, password });

  if (user) {
    res.status(201).json({
      _id: user._id,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
    
  } else {
    res.status(400).json({ message: "Registration failed" });
  }
});

const fetchAllUsersController = expressAsyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await userModel.find(keyword).find({ _id: { $ne: req.user._id } });
  res.send(users);
});
const addKeywordsController = expressAsyncHandler(async (req, res) => {
  const { userId, keywords } = req.body;

  if (!userId || !Array.isArray(keywords)) {
    res.status(400).json({ message: "Invalid input. User ID and keywords are required." });
    return;
  }

  const validKeywords = keywords.filter(keyword => typeof keyword === 'string' && keyword.trim() !== '');

  if (validKeywords.length === 0) {
    res.status(400).json({ message: "No valid keywords provided." });
    return;
  }

  const user = await userModel.findById(userId);

  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  user.keywords = [...new Set([...user.keywords, ...validKeywords])];
  
  await user.save();

  res.status(200).json({ message: "Keywords added successfully", keywords: user.keywords });
});


const editUserController = expressAsyncHandler(async (req, res) => {
  const { userId, currentPassword, newPassword, email, organisationName, notificationReceive } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ message: "User ID, current password, and new password are required." });
  }
  console.log(userId, currentPassword, newPassword, email, organisationName, notificationReceive)

  const user = await userModel.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordCorrect) {
    return res.status(401).json({ message: "Current password is incorrect." });
  }

  if (email) {
    user.email = email;
  }

  if (newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
  }

  if (organisationName !== undefined) {
    user.organisationName = organisationName;
  }

  if (notificationReceive !== undefined) {
    user.notificationReceive = notificationReceive;
  }
  console.log(user)
  await user.save();

  res.status(200).json({ message: "User details updated successfully", user });
});



const getKeywordsController = expressAsyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ message: "User ID is required." });
    return;
  }

  const user = await userModel.findById(userId);

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({ keywords: user.keywords });
});


module.exports = {
  loginController,
  registerController,
  fetchAllUsersController,
  addKeywordsController,
  editUserController,
  getKeywordsController
};
