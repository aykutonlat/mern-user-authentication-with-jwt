import dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../../models/userModel";

dotenv.config();

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  userId?: string;
}

export const validUserToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization token is missing or malformed.",
      code: "NO_TOKEN",
      details: "A valid access token is required to access this resource.",
    });
  }

  const token = authHeader.split(" ")[1];

  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  if (!accessTokenSecret) {
    return res.status(500).json({
      message: "Access token secret is missing.",
      code: "MISSING_SECRET",
      details: "The server is missing the access token secret.",
    });
  }

  jwt.verify(token, accessTokenSecret, (err, decodedToken) => {
    if (err) {
      return res.status(401).json({
        message: "Invalid or expired token.",
        code: "INVALID_TOKEN",
        details: "The provided token is invalid, expired, or malformed.",
      });
    }

    const { userId } = decodedToken as JwtPayload;
    req.userId = userId;
    next();
  });
};
