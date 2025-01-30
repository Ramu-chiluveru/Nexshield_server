const mongoose = require("mongoose");

const userModel = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    notificationReceive: {
      type: Boolean,
      default: true, 
    },
    organisationName: {
      type: String, 
      default: "", 
      trim: true,
    },
    subscriptionStatus: {
      type: Boolean,  
      default: false,
    },
    keywords: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 20; 
        },
        message: "You can only add up to 20 keywords.",
      },
    },
  },
  {
    timestamps: true, 
  }
);

const User = mongoose.model("User", userModel);

module.exports = User;
