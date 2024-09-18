import request from "supertest";
import { app } from "../src/app";
import mongoose from "mongoose";
import { User } from "../src/models/userModel";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

jest.mock("nodemailer");

beforeAll(async () => {
  const mongoUrl = process.env.MONGO_URI as string;
  await mongoose.connect(mongoUrl);
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

describe("Auth Endpoints", () => {
  let sendMailMock: jest.Mock;

  beforeAll(() => {
    sendMailMock = jest.fn().mockResolvedValue({
      accepted: ["testuser@example.com"],
      rejected: [],
    });

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });
  });
  describe("Register Endpoint", () => {
    afterEach(async () => {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
      } else {
        throw new Error("Mongoose connection is not established");
      }
    });
    it("should register a new user successfully", async () => {
      const res = await request(app).post("/register").send({
        username: "testuser",
        email: "testuser@example.com",
        password: "Test1234",
      });

      if (res.statusCode === 500) {
        expect(res.body).toHaveProperty(
          "message",
          "Failed to send registration email."
        );
        expect(res.body).toHaveProperty("code", "MAIL_SEND_ERROR");
      } else {
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty("accessToken");
        expect(res.body).toHaveProperty("refreshToken");
        expect(res.body).toHaveProperty("message", "Registration successful.");
        expect(res.body).toHaveProperty("code", "REGISTRATION_SUCCESS");
        expect(res.body).toHaveProperty(
          "details",
          "User account created successfully."
        );
        expect(sendMailMock).toHaveBeenCalledTimes(1);
        expect(sendMailMock.mock.calls[0][0].to).toBe("testuser@example.com");
      }
    });
    it("should return error if username is missing", async () => {
      const res = await request(app).post("/register").send({
        email: "testuser@example.com",
        password: "Test1234",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Username is required.");
      expect(res.body).toHaveProperty("code", "MISSING_USERNAME");
      expect(res.body).toHaveProperty(
        "details",
        "A valid username is required to register."
      );
    });

    it("should return error if email is missing", async () => {
      const res = await request(app).post("/register").send({
        username: "testuser",
        password: "Test1234",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Email is required.");
      expect(res.body).toHaveProperty("code", "MISSING_EMAIL");
      expect(res.body).toHaveProperty(
        "details",
        "A valid email address is required to register."
      );
    });

    it("should return error if password is missing", async () => {
      const res = await request(app).post("/register").send({
        username: "testuser",
        email: "testuser@example.com",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Password is required.");
      expect(res.body).toHaveProperty("code", "MISSING_PASSWORD");
      expect(res.body).toHaveProperty(
        "details",
        "A password is required to create an account."
      );
    });

    it("should return error for invalid password format (too short)", async () => {
      const res = await request(app).post("/register").send({
        username: "testuser",
        email: "testuser@example.com",
        password: "short",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Invalid password format.");
      expect(res.body).toHaveProperty("code", "INVALID_PASSWORD");
      expect(res.body).toHaveProperty(
        "details",
        "Password must be at least 6 characters long, and contain at least one uppercase and one lowercase letter."
      );
    });

    it("should return error for password without uppercase letter", async () => {
      const res = await request(app).post("/register").send({
        username: "testuser",
        email: "testuser@example.com",
        password: "testpassword1",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Invalid password format.");
      expect(res.body).toHaveProperty("code", "INVALID_PASSWORD");
      expect(res.body).toHaveProperty(
        "details",
        "Password must be at least 6 characters long, and contain at least one uppercase and one lowercase letter."
      );
    });

    it("should return error if username already exists", async () => {
      await request(app).post("/register").send({
        username: "duplicateuser",
        email: "duplicateuser@example.com",
        password: "Test1234",
      });

      const res = await request(app).post("/register").send({
        username: "duplicateuser",
        email: "newemail@example.com",
        password: "Test1234",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Username already exists.");
      expect(res.body).toHaveProperty("code", "USERNAME_EXISTS");
      expect(res.body).toHaveProperty(
        "details",
        "The provided username is already taken. Please choose another one."
      );
    });

    it("should return error if email already exists", async () => {
      await request(app).post("/register").send({
        username: "newuser",
        email: "duplicateemail@example.com",
        password: "Test1234",
      });

      const res = await request(app).post("/register").send({
        username: "uniqueuser",
        email: "duplicateemail@example.com",
        password: "Test1234",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Email already exists.");
      expect(res.body).toHaveProperty("code", "EMAIL_EXISTS");
      expect(res.body).toHaveProperty(
        "details",
        "The provided email address is already associated with an account."
      );
    });

    it("should return error if registration fails (server error)", async () => {
      jest
        .spyOn(User.prototype, "save")
        .mockRejectedValueOnce(new Error("Something went wrong"));

      const res = await request(app).post("/register").send({
        username: "newuser",
        email: "newuser@example.com",
        password: "Test1234",
      });

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("message", "Something went wrong");
    });
    it("should return error for invalid email format", async () => {
      const res = await request(app).post("/register").send({
        username: "testuser",
        email: "invalidemail",
        password: "Test1234",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Invalid email format.");
    });
  });
  describe("Login Endpoint", () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = new User({
        username: "testuser",
        email: "testuser@example.com",
        password: await bcrypt.hash("Test1234", 10),
        isActive: true,
        accountStatus: "active",
        failedLoginAttempts: 0,
      });
      await testUser.save();
    });

    afterEach(async () => {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
      }
    });

    it("should login the registered user successfully", async () => {
      const res = await request(app).post("/login").send({
        username: "testuser",
        password: "Test1234",
      });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
    });

    it("should return error if username or password is missing", async () => {
      const res = await request(app).post("/login").send({
        username: "testuser",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty(
        "message",
        "Please provide a username and password."
      );
      expect(res.body).toHaveProperty("code", "MISSING_CREDENTIALS");
    });

    it("should return error if user does not exist", async () => {
      const res = await request(app).post("/login").send({
        username: "wronguser",
        password: "Test1234",
      });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("message", "User does not exist.");
      expect(res.body).toHaveProperty("code", "USER_NOT_FOUND");
    });

    it("should return error if password is incorrect", async () => {
      const res = await request(app).post("/login").send({
        username: "testuser",
        password: "WrongPassword",
      });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("message", "Invalid password.");
      expect(res.body).toHaveProperty("code", "INVALID_PASSWORD");
    });

    it("should return error if account is inactive", async () => {
      testUser.isActive = false;
      await testUser.save();

      const res = await request(app).post("/login").send({
        username: "testuser",
        password: "Test1234",
      });
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty("message", "Your account is inactive.");
      expect(res.body).toHaveProperty("code", "USER_NOT_ACTIVE");
    });

    it("should return error if account is suspended", async () => {
      testUser.accountStatus = "suspended";
      await testUser.save();

      const res = await request(app).post("/login").send({
        username: "testuser",
        password: "Test1234",
      });
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty(
        "message",
        "Your account is suspended. Please contact support."
      );
      expect(res.body).toHaveProperty("code", "ACCOUNT_SUSPENDED");
    });

    it("should return error if account is locked due to too many failed attempts", async () => {
      testUser.accountLocked = true;
      testUser.lockUntil = new Date(Date.now() + 5 * 60 * 1000); // Locked for 5 minutes
      await testUser.save();

      const res = await request(app).post("/login").send({
        username: "testuser",
        password: "Test1234",
      });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty("message");
      expect(res.body).toHaveProperty("code", "ACCOUNT_LOCKED");
    });

    it("should reset failed attempts after successful login", async () => {
      testUser.failedLoginAttempts = 3;
      await testUser.save();

      const res = await request(app).post("/login").send({
        username: "testuser",
        password: "Test1234",
      });

      expect(res.statusCode).toEqual(200);
      const updatedUser = await User.findOne({ username: "testuser" });
      expect(updatedUser?.failedLoginAttempts).toEqual(0);
    });
  });
  describe("Check Username Endpoint", () => {
    afterEach(async () => {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
      }
    });

    it("should return error if username is missing", async () => {
      const res = await request(app).post("/check-username").send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Username is required.");
      expect(res.body).toHaveProperty("code", "MISSING_USERNAME");
    });

    it("should return error if username is too short", async () => {
      const res = await request(app).post("/check-username").send({
        username: "usr",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Invalid username.");
      expect(res.body).toHaveProperty("code", "INVALID_USERNAME");
    });

    it("should return error if username is too long", async () => {
      const res = await request(app).post("/check-username").send({
        username: "thisusernameiswaytoolongformyliking",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Invalid username.");
      expect(res.body).toHaveProperty("code", "INVALID_USERNAME");
    });

    it("should return error if username is already taken", async () => {
      // Create a user with a taken username
      await new User({
        username: "takenusername",
        email: "test@example.com",
        password: "Test1234",
      }).save();

      const res = await request(app).post("/check-username").send({
        username: "takenusername",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty(
        "message",
        "This username cannot be used."
      );
      expect(res.body).toHaveProperty("code", "USERNAME_TAKEN");
    });

    it("should return success if username is available", async () => {
      const res = await request(app).post("/check-username").send({
        username: "availableusername",
      });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("message", "Username available.");
      expect(res.body).toHaveProperty("code", "USERNAME_AVAILABLE");
    });

    it("should return a server error if something goes wrong", async () => {
      // Simulate a server error by mocking the `findOne` method
      jest
        .spyOn(User, "findOne")
        .mockRejectedValueOnce(new Error("Server error"));

      const res = await request(app).post("/check-username").send({
        username: "someusername",
      });
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("message", "Server error");
    });
  });
  describe("Check Email Endpoint", () => {
    afterEach(async () => {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
      }
    });

    it("should return error if email is missing", async () => {
      const res = await request(app).post("/check-email").send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Email is required");
      expect(res.body).toHaveProperty("code", "MISSING_EMAIL");
    });

    it("should return error for invalid email format", async () => {
      const res = await request(app).post("/check-email").send({
        email: "invalidemail",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Invalid email format");
      expect(res.body).toHaveProperty("code", "INVALID_EMAIL");
    });

    it("should return error if email is already taken", async () => {
      // Bir kullanıcı oluşturalım
      await new User({
        username: "testuser",
        email: "testuser@example.com",
        password: "Test1234",
      }).save();

      const res = await request(app).post("/check-email").send({
        email: "testuser@example.com",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "This email cannot be used");
      expect(res.body).toHaveProperty("code", "EMAIL_TAKEN");
    });

    it("should return success if email is available", async () => {
      const res = await request(app).post("/check-email").send({
        email: "available@example.com",
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("message", "Email is available");
      expect(res.body).toHaveProperty("code", "EMAIL_AVAILABLE");
    });

    it("should return a server error if something goes wrong", async () => {
      jest
        .spyOn(User, "findOne")
        .mockRejectedValueOnce(new Error("Server error"));

      const res = await request(app).post("/check-email").send({
        email: "error@example.com",
      });

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("message", "Something went wrong");
      expect(res.body).toHaveProperty("code", "INTERNAL_SERVER_ERROR");
    });
  });
  describe("Verify Email Endpoint", () => {
    let validToken: string;
    let expiredToken: string;
    let testUser: any;

    beforeEach(async () => {
      testUser = new User({
        username: "testuser",
        email: "testuser@example.com",
        password: "Test1234",
        verifyEmail: false,
        emailVerificationToken: "someVerificationToken",
        emailVerificationExpires: new Date(Date.now() + 60 * 60 * 1000),
      });
      await testUser.save();

      validToken = jwt.sign(
        { userId: testUser._id },
        process.env.REGISTRATION_TOKEN_SECRET as string,
        { expiresIn: "1h" }
      );

      expiredToken = jwt.sign(
        { userId: testUser._id },
        process.env.REGISTRATION_TOKEN_SECRET as string,
        { expiresIn: "-1h" } // Süresi geçmiş token
      );
    });

    afterEach(async () => {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
      }
    });

    it("should return error if token is missing", async () => {
      const res = await request(app).get("/verify-email/ ");
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty(
        "message",
        "Verification link is missing."
      );
      expect(res.body).toHaveProperty("code", "MISSING_TOKEN");
      expect(res.body).toHaveProperty(
        "details",
        "A valid verification link is required to verify the email address."
      );
    });

    it("should return error for invalid token", async () => {
      const res = await request(app).get("/verify-email/invalidtoken");
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("message", "Invalid token.");
      expect(res.body).toHaveProperty("code", "INVALID_TOKEN");
    });

    it("should return error if token is expired", async () => {
      const res = await request(app).get(`/verify-email/${expiredToken}`);
      expect(res.statusCode).toEqual(410);
      expect(res.body).toHaveProperty(
        "message",
        "The verification link is invalid or has expired."
      );
      expect(res.body).toHaveProperty("code", "INVALID_TOKEN");
    });

    it("should return error if user not found", async () => {
      const nonExistentToken = jwt.sign(
        { userId: new mongoose.Types.ObjectId() },
        process.env.REGISTRATION_TOKEN_SECRET as string,
        { expiresIn: "1h" }
      );

      const res = await request(app).get(`/verify-email/${nonExistentToken}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("message", "User not found.");
      expect(res.body).toHaveProperty("code", "USER_NOT_FOUND");
    });

    it("should return error if email is already verified", async () => {
      testUser.verifyEmail = true;
      await testUser.save();

      const res = await request(app).get(`/verify-email/${validToken}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("message", "Email already verified.");
      expect(res.body).toHaveProperty("code", "EMAIL_ALREADY_VERIFIED");
    });

    it("should successfully verify email if valid token is provided", async () => {
      const res = await request(app).get(`/verify-email/${validToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("message", "Email verified.");
      expect(res.body).toHaveProperty("code", "EMAIL_VERIFIED");

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.verifyEmail).toBe(true);
      expect(updatedUser?.emailVerificationToken).toBe("");
    });

    it("should return server error if something goes wrong", async () => {
      jest
        .spyOn(User, "findById")
        .mockRejectedValueOnce(new Error("Server error"));

      const res = await request(app).get(`/verify-email/${validToken}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("message", "Server error");
    });
  });
});
