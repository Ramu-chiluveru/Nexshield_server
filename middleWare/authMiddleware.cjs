const jwt = require("jsonwebtoken");
const User = require("../models/userModel.cjs");
const expressAsyncHandler = require("express-async-handler");

const protect = expressAsyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        throw new Error("User not found");
      }

      next();
    } catch (error) {
      console.error(error.message);
      res.status(401).send("Not authorized, token failed");
    }
  } else {
    res.status(401).send("Not authorized, no token");
  }
});

module.exports = protect;