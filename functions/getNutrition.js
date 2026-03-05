import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const getNutrition = async (food) => {
    const api = process.env.SPOONACULAR_API;

    try {
        const searchResponse = await fetch(`https://api.spoonacular.com/food/ingredients/search?query=${encodeURIComponent(food)}&number=1&apiKey=${api}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!searchResponse.ok) {
            const errorData = await searchResponse.json();
            throw new Error(`Search API error: ${searchResponse.status} - ${errorData.message || searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();

        if (!searchData.results || searchData.results.length === 0) {
            throw new Error(`No search results found for "${food}".`);
        }

        const ingredientId = searchData.results[0].id;

        const infoResponse = await fetch(`https://api.spoonacular.com/food/ingredients/${ingredientId}/information?amount=100&unit=grams&apiKey=${api}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!infoResponse.ok) {
            const errorData = await infoResponse.json();
            throw new Error(`Information API error: ${infoResponse.status} - ${errorData.message || infoResponse.statusText}`);
        }

        const ingredientInfo = await infoResponse.json();

        // *** MODIFICATION HERE: Return only the nutrition property ***
        if (ingredientInfo && ingredientInfo.nutrition) {
            return ingredientInfo.nutrition;
        } else {
            // Handle cases where nutrition data might be missing, though unlikely for common ingredients
            throw new Error(`Nutrition data not found for "${food}".`);
        }

    } catch (error) {
        console.error("Error fetching nutrition data:", error);
        throw new Error(`Failed to fetch nutrition data: ${error.message}. Please try again later.`);
    }
};

export default getNutrition;
