const mongoose = require("mongoose");

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
      default: true, 
    },
    organisationNames: {
      type: [String], 
      default: [], 
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
