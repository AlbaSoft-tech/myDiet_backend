import { GoogleGenAI } from "@google/genai";
import JSON5 from "json5";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function generate(input, type) {
  let prompt = "";
  if (type === "diet") {
    let {
      foodTimes,
      calories,
      protein,
      dessert,
      allergens,
      waterIntake,
      preferredFoods,
      notPreferredFoods,
      dietType,
      goal,
    } = input;

    if (foodTimes > 6) {
      foodTimes = 6;
    }

    prompt = `
Generate a diet that has ${foodTimes} meals, ${calories} calories, and ${protein}g protein.
${dessert ? "Include a healthy dessert." : "Do not include a dessert."}
${allergens ? `allergens: ${allergens}.` : ""}
water intake: ${waterIntake} liters.
${preferredFoods ? `foods I like: ${preferredFoods}.` : ""}
${notPreferredFoods ? `foods I do not like: ${notPreferredFoods}.` : ""}
${dietType ? `diet type: ${dietType}.` : ""}
${goal === "lose" ? "Make the diet lower in carbs and high in protein" : "The diet should be high in carbs and protein"}

For EVERY ingredient, you MUST provide estimated nutrition data. Include the 4 main macros and these specific micronutrients: Magnesium, Calcium, Iron, Potassium, and Vitamin C.

Return JSON in this EXACT format:
{
  "waterIntake": ${waterIntake},
  "generated": {
    "meals": [
      {
        "name": "Meal Name",
        "howToMake": "Explain how to make it.",
        "calories": 500,
        "ingredients": [
          { 
            "name": "Ingredient Name", 
            "amount_g": 100,
            "nutrition": {
              "nutrients": [
                { "name": "Calories", "amount": 120, "unit": "kcal" },
                { "name": "Protein", "amount": 20, "unit": "g" },
                { "name": "Fat", "amount": 5, "unit": "g" },
                { "name": "Carbohydrates", "amount": 0, "unit": "g" },
                { "name": "Magnesium", "amount": 25, "unit": "mg" },
                { "name": "Calcium", "amount": 10, "unit": "mg" },
                { "name": "Iron", "amount": 1.2, "unit": "mg" },
                { "name": "Potassium", "amount": 200, "unit": "mg" },
                { "name": "Vitamin C", "amount": 5, "unit": "mg" }
                { "name": "Vitamin D", "amount": 10, "unit": "mcg" }
                { "name": "Vitamin A", "amount": 10, "unit": "mcg" }
                { "name": "Vitamin K", "amount": 10, "unit": "mcg" }  
                { "name": "Zinc", "amount": 25, "unit": "mg" },
              ]
            }
          }
        ]
      }
    ]
  }
}

⚠️ Rules:
- Only base ingredient names (no "fresh", "raw", "boiled").
- Measurements only in grams (g).
- Return ONLY the JSON.
    `;
  }

  const apiKey = process.env.GEMINI_API;

  if (!apiKey) {
    throw new Error("API key is missing.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
  });

  try {
    console.log("Prompting Gemini...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const result = response.candidates[0].content.parts[0];
    const answer = result.text;

    const start = answer.indexOf("{");
    const end = answer.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("No JSON object found.");
    }

    const jsonStr = answer.slice(start, end + 1);
    const generated = JSON5.parse(jsonStr);

    return generated;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

export default generate;
