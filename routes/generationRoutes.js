import express from "express";
import generation from "../functions/generate.js";
import dotenv from "dotenv";
import db from "../db/firebase.js";
import { Paddle, EventName } from "@paddle/paddle-node-sdk";

const paddle = new Paddle({
  apiKey:
    "pdl_sdbx_apikey_01kjzypg6yj9xg0ag5vch26r87_NnEXkyCbbsQtGYHDa1HvRR_ARR",
  environment: "production",
});

dotenv.config({ path: "../.env" });

const router = express.Router();

router.post(
  "/diet",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["paddle-signature"] || "";
    const rawRequestBody = req.body;
    const secretKey =
      "pdl_ntfset_01kjzwcvkk4v1st6zfhbtwhvvd_uEZPQ2zqoKKP8RXaJ9YX3fj+KTZOHnGQ";

    try {
      if (!signature || !rawRequestBody) {
        return res.status(400).send("Missing signature");
      }

      const eventData = await paddle.webhooks.unmarshal(
        rawRequestBody,
        secretKey,
        signature,
      );

      if (eventData.eventType !== EventName.TransactionCompleted) {
        console.log("Ignored event:", eventData.eventType);
        return res.status(200).send("Ignored");
      }

      const transactionId = eventData.data.id;

      // 🔒 Prevent duplicate processing
      const existing = await db
        .collection("diets")
        .where("transactionId", "==", transactionId)
        .limit(1)
        .get();

      if (!existing.empty) {
        console.log("Duplicate webhook ignored:", transactionId);
        return res.status(200).send("Already processed");
      }

      const { prompt, type } = eventData.data.customData;

      const generated = await generation(prompt, type);

      if (!generated) {
        return res.status(500).json({ message: "Generation failed" });
      }

      const docRef = await db.collection("diets").add({
        transactionId,
        diet: generated,
        createdAt: new Date(),
      });

      console.log("Diet generated:", docRef.id);

      return res
        .status(200)
        .json({ message: "Diet generated successfully", id: docRef.id });
    } catch (error) {
      console.error("Error in generation route", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

router.get("/fetch", async (req, res) => {
  try {
    const { code } = req.query;

    const docRef = db.collection("diets").doc(code);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: "Diet not found" });
    }

    return res.status(200).json({
      id: docSnap.id,
      ...docSnap.data(),
    });
  } catch (error) {
    console.error("Error in fetch route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
