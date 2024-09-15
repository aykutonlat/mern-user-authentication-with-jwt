import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { login, register } from "./controllers/userAuth/userController";
import connectDB from "./config/database";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

connectDB();

app.post("/register", register);
app.post("/login", login);

export { app };
