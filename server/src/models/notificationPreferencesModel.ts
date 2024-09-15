import mongoose, { Schema, Document } from "mongoose";

export interface INotificationPreferences extends Document {
  userId: mongoose.Types.ObjectId;
  email: boolean;
  sms: boolean;
  push: boolean;
}

const notificationPreferencesSchema = new Schema<INotificationPreferences>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  email: {
    type: Boolean,
    default: true,
  },
  sms: {
    type: Boolean,
    default: false,
  },
  push: {
    type: Boolean,
    default: false,
  },
});

export const NotificationPreferences = mongoose.model<INotificationPreferences>(
  "NotificationPreferences",
  notificationPreferencesSchema
);
