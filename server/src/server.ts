import { app } from "./app";
import dotenv from "dotenv";
import {
  emailSuspensionCron,
  emailSuspensionWarningCron,
} from "./jobs/emailVerifyCron";

dotenv.config();

const PORT = process.env.PORT || 5000;

emailSuspensionCron();
emailSuspensionWarningCron();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
