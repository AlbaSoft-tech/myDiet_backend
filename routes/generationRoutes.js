import express from "express";
import generation from "../functions/generate.js";
import dotenv from "dotenv";
import db from "../db/firebase.js";

dotenv.config({ path: "../.env" });

const router = express.Router();

router.post(
  "/diet",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["paddle-signature"] || "";
    console.log(signature);
    const rawRequestBody = req.body;
    const secretKey =
      "pdl_ntfset_01kjzwcvkk4v1st6zfhbtwhvvd_uEZPQ2zqoKKP8RXaJ9YX3fj+KTZOHnGQ";

    let prompt, type;
    try {
      if (signature && rawRequestBody) {
        const eventData = await paddle.webhooks.unmarshal(
          rawRequestBody,
          secretKey,
          signature,
        );
        switch (eventData.eventType) {
          case EventName.TransactionCompleted:
            ({ prompt, type } = eventData.data.customData);
            break;
          default:
            console.log("Ignored event:", eventData.eventType);
        }
      } else {
        console.log("Signature missing in header");
      }
      if (!prompt || !type) {
        return res
          .status(400)
          .json({ message: "Missing prompt or type in request" });
      }
      const generated = await generation(prompt, type);

      if (!generated) {
        return res
          .status(500)
          .json({ message: "Generation failed, please try again" });
      }

      const docRef = await db.collection("diets").add({
        diet: {
          ...generated,
        },
        createdAt: new Date(),
      });
      console.log("done");
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
