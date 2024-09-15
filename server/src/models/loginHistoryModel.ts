import mongoose, { Schema, Document } from "mongoose";

export interface ILoginHistory extends Document {
  userId: mongoose.Types.ObjectId;
  loginTime: Date;
  logoutTime: Date;
  ipAddress: string;
}

const loginHistorySchema = new Schema<ILoginHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    loginTime: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LoginHistory = mongoose.model<ILoginHistory>(
  "LoginHistory",
  loginHistorySchema
);
