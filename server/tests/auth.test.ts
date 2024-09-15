import request from "supertest";
import { app } from "../src/app";
import mongoose from "mongoose";
import { User } from "../src/models/userModel";
import bcrypt from "bcrypt";

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
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body).toHaveProperty("message", "Registration successful.");
      expect(res.body).toHaveProperty("code", "REGISTRATION_SUCCESS");
      expect(res.body).toHaveProperty(
        "details",
        "User account created successfully."
      );
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
});
