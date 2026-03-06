import express from "express";
import generation from "../functions/generate.js";
import dotenv from "dotenv";
import db from "../db/firebase.js";
import { Paddle, EventName, Environment } from "@paddle/paddle-node-sdk";
import { Resend } from "resend";

const resend = new Resend("re_e9JPf6YP_26sH57apgcwezDQ9PX6X4yJ7");

const paddle = new Paddle(
  "pdl_sdbx_apikey_01kjzypg6yj9xg0ag5vch26r87_NnEXkyCbbsQtGYHDa1HvRR_ARR",
  {
    environment: Environment.sandbox,
  },
);

dotenv.config({ path: "../.env" });

const router = express.Router();

router.post(
  "/diet",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    // Respond to Paddle immediately
    res.status(200).send("OK");

    const signature = req.headers["paddle-signature"] || "";
    const rawRequestBody = req.body.toString(); // make sure it's a string
    const secretKey =
      "pdl_ntfset_01kjzwcvkk4v1st6zfhbtwhvvd_uEZPQ2zqoKKP8RXaJ9YX3fj+KTZOHnGQ";

    try {
      if (!signature || !rawRequestBody) {
        console.log("Missing signature");
        return;
      }

      const eventData = await paddle.webhooks.unmarshal(
        rawRequestBody,
        secretKey,
        signature,
      );

      if (eventData.eventType !== EventName.TransactionCompleted) {
        console.log("Ignored event:", eventData.eventType);
        return;
      }

      const transactionId = eventData.data.id;

      const existing = await db
        .collection("diets")
        .where("transactionId", "==", transactionId)
        .limit(1)
        .get();

      if (!existing.empty) {
        console.log("Duplicate webhook ignored:", transactionId);
        return;
      }

      const { prompt, type } = eventData.data.customData;

      const generated = await generation(prompt, type);

      if (!generated) {
        console.error("Generation failed for transaction:", transactionId);
        return;
      }

      const docRef = await db.collection("diets").add({
        transactionId,
        diet: generated,
        createdAt: new Date(),
      });

      const customerId = eventData.data.customerId;
      const customerResponse = await paddle.customers.get(customerId);
      console.log(customerResponse);

      if (!email) {
        console.error("No email found for customer:", customerId);
        return;
      }

      await resend.emails.send({
        from: "Matura App <no-reply@maturaapp.org>",
        to: email.toLowerCase(),
        subject: "Your Personalized Diet Plan is Ready! - Matura",
        text: `Hello,

Your personalized diet plan has been generated and is ready for you!

You can access your plan in the app using your Order Reference Code: ${docRef.id}

Thank you for choosing Matura to help with your health goals.

If you have any questions, feel free to reach out to our support team.

Best regards,
The Matura Team`,
        html: `
<div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #2e7d32; text-align: center; margin-bottom: 20px;">Your Diet Plan is Ready!</h2>
    <p>Hello,</p>
    <p>Great news! Our AI has finished generating your personalized diet plan based on your preferences.</p>

    <div style="background-color: #f0f4f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
        <p style="font-size: 14px; color: #666; margin: 0;">Order Reference Code</p>
        <p style="font-size: 20px; font-weight: bold; color: #2e7d32; margin: 5px 0;">${docRef.id}</p>
    </div>

    <p>You can use the code above to pull up your plan anytime inside the Matura app.</p>
    
    <p style="margin-top: 30px; text-align: center; color: #555;">
        To your health,<br>
        <strong>The Matura Team</strong>
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
    <p style="font-size: 0.8em; text-align: center; color: #aaa;">
        This is an automated delivery email for your purchase. Please do not reply directly to this message.
    </p>
</div>
`,
      });

      console.log("Diet generated:", docRef.id);
    } catch (error) {
      console.error("Error in webhook processing:", error);
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
