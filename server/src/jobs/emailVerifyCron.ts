import cron from "node-cron";
import ms from "ms";
import { User } from "../models/userModel";
import { sendSuspensionMail } from "../mails/suspendInfoMail";
import { sendSuspensionWarningMail } from "../mails/suspensionWarningMail";

export const emailSuspensionCron = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const users = await User.find({
        verifyEmail: false,
        emailVerificationExpires: { $lt: new Date() },
        accountStatus: "active",
      });

      for (const user of users) {
        user.accountStatus = "suspended";
        const sendMail = await sendSuspensionMail(user.username, user.email);
        if (!sendMail) {
          console.error("Error sending suspension email");
        }
        await user.save();
      }
    } catch (error) {
      console.error("Error in cron job:", error);
    }
  });
};

export const emailSuspensionWarningCron = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const oneDayFromNow = new Date(Date.now() + ms("1d"));

      const users = await User.find({
        verifyEmail: false,
        emailVerificationExpires: { $lt: oneDayFromNow, $gt: new Date() },
        accountStatus: "active",
      });

      for (const user of users) {
        const sendMail = await sendSuspensionWarningMail(
          user.username,
          user.email,
          user.emailVerificationToken
        );
        if (!sendMail) {
          console.error("Error sending suspension warning email");
        }
      }
    } catch (error) {
      console.error("Error in suspension warning cron job:", error);
    }
  });
};
