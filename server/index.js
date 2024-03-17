import express from "express";
import cors from "cors";
import morgan from "morgan"; // Import morgan
import rateLimit from "express-rate-limit"; // Import express-rate-limit
import { getTextGemini } from "./gemini.js";
import { getImageTitan } from "./aws.js";

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Custom Morgan format to log request bodies
morgan.token("body", (req) => JSON.stringify(req.body));

const loggerFormat = ":method :url :status :response-time ms - :res[content-length] :body";

app.use(morgan(loggerFormat));

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 requests per windowMs
    message: "Too many requests from this IP, please try again after a minute",
});

// Apply the rate limiter to all requests
app.use(limiter);

app.post("/interact", async (req, res) => {
    let userInput = req.body.input;
    const temperature = req.body.temperature || 0.5;

    try {
        const textResponse = await getTextGemini(userInput, temperature);
        userInput = userInput?.toLowerCase();
        let imageResponse;
        if (userInput.includes("paint") || userInput.includes("draw") || userInput.includes("generate")) {
            imageResponse = await getImageTitan(textResponse.substr(0, 200));
        }

        res.json({ textResponse, imageResponse });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "An error occurred while interacting with the Gemini Pro model",
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

process.env["GOOGLE_APPLICATION_CREDENTIALS"] = "./google.json";
