import express from "express";
import "dotenv/config";
import generationRoutes from "./routes/generationRoutes.js";
import cors from "cors";
import db from "./db/firebase.js";

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: ["https://get-my-diet.com", "https://www.get-my-diet.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

const unless = function (path, middleware) {
  return function (req, res, next) {
    if (req.originalUrl.startsWith(path)) {
      return next();
    } else {
      return middleware(req, res, next);
    }
  };
};

app.use(unless("/api/generate/diet", express.json()));

app.use("/api/generate", generationRoutes);

app.listen(PORT, async () => {
  try {
    console.log("Server is running on port " + PORT);
    const snapshot = await db.collection("test").get();
    console.log("db connected");
  } catch (error) {
    console.error("Error connecting to Firestore:", error);
  }
});
