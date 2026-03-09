import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve the frontend

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/suggestions', async (req, res) => {
    try {
        const { primary, aqiLevel, location } = req.body;
        
        const prompt = `
        You are an expert environmental health advisor for a real-time air quality monitoring application called AirAware.
        Current Air Quality Status:
        - Location: ${location}
        - Primary Pollutant: ${primary}
        - AQI Level: ${aqiLevel}
        
        Provide highly professional, accurate, and concise recommendations tailored specifically to this situation in JSON format.
        
        The JSON should strictly match this structure:
        {
          "advancedDetails": {
            "title": "Title of the alert (e.g. Poor Air Quality Due to PM2.5)",
            "description": "A 2-3 sentence description of the health risks and context.",
            "actions": [
              "Action 1",
              "Action 2",
              "Action 3",
              "Action 4",
              "Action 5"
            ]
          },
          "governmentSolutions": {
            "government": [
              "Gov Action 1",
              "Gov Action 2",
              "Gov Action 3",
              "Gov Action 4",
              "Gov Action 5",
              "Gov Action 6"
            ],
            "healthcare": [
              "Health Action 1",
              "Health Action 2",
              "Health Action 3",
              "Health Action 4",
              "Health Action 5",
              "Health Action 6"
            ]
          }
        }
        
        Ensure the recommendations sound actionable, modern, and backed by environmental science. Do NOT include markdown in the JSON string.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                 responseMimeType: "application/json",
            }
        });
        
        const result = JSON.parse(response.text);
        res.json(result);
    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: "Failed to generate suggestions" });
    }
});

app.listen(port, () => {
    console.log(`AirAware server running at http://localhost:${port}`);
});
