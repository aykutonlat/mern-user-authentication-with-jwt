import { transporter } from "../config/mailSettings";
import dotenv from "dotenv";

dotenv.config();

export const sendNewLoginAlertMail = async (
  username: string,
  email: string,
  ipAddress: string,
  loginTime: string
): Promise<boolean> => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "New Login Detected on Your Account",
    html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>New Login Detected</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #f4f4f4;
                    font-family: Arial, sans-serif;
                }
                table {
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }
                td {
                    padding: 20px;
                }
                h1 {
                    color: #333333;
                }
                p {
                    color: #555555;
                    margin-bottom: 20px;
                }
                .info-box {
                    background-color: #f9f9f9;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    margin-top: 10px;
                }
                .button {
                    display: inline-block;
                    padding: 12px 25px;
                    margin-top: 20px;
                    font-size: 16px;
                    color: #ffffff !important;
                    background-color: #4CAF50;
                    text-decoration: none;
                    border-radius: 5px;
                    cursor: pointer;
                    width: auto;
                    max-width: 150px;
                    text-align: center;
                }
                .button:hover {
                    background-color: #45a049;
                }
                .link {
                    color: #4CAF50 !important;
                    text-decoration: none !important;
                    font-size: 12px;
                    word-wrap: break-word;
                }
                @media only screen and (max-width: 600px) {
                    table {
                        width: 100%;
                    }
                    .button {
                        width: 100%;
                        text-align: center;
                    }
                }
            </style>
        </head>
        <body>
            <table>
                <tr>
                    <td>
                        <h1>Hi ${username},</h1>
                        <p>We noticed a new login on your account from a new IP address. Here are the details:</p>
                        
                        <div class="info-box">
                            <p><strong>IP Address:</strong> ${ipAddress}</p>
                            <p><strong>Login Time:</strong> ${loginTime}</p>
                        </div>

                        <p>If this was you, no further action is required. However, if you did not recognize this activity, we recommend that you <strong>change your password</strong> immediately to secure your account.</p>
                        <a href="${process.env.CLIENT_URL}/reset-password" class="button">Change Password</a>
                        
                        <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
                        <a class="link" href="${process.env.CLIENT_URL}/reset-password">${process.env.CLIENT_URL}/reset-password</a>

                        <p>Stay secure!<br>Your Company Name</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending new login alert email:", error);
    return false;
  }
};
