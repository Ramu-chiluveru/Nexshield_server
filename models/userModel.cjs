const mongoose = require("mongoose");

// Define the User schema
const userModel = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true,
    },
    notificationReceive: {
      type: Boolean,
      default: true, // Default is to receive notifications
    },
    organisationNames: {
      type: [String], // Array of strings
      default: [], // Default is an empty array
    },
    subscriptionStatus: {
      type: String,
      type: Boolean,
      default: "false"
    },
  },
  {
    timestamps: true, 
  }
);




const User = mongoose.model("User", userModel);

module.exports = User;
