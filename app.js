import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import mongoose from 'mongoose';
import { pipeline } from '@xenova/transformers';
import userRoutes from './routes/userRoutes.js';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = process.env.COLLECTION_NAME;
const SEARCH_INDEX_NAME = process.env.SEARCH_INDEX_NAME;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AZURE_API_KEY = process.env.AZURE_API_KEY;
const GPT4_ENDPOINT = process.env.GPT4_ENDPOINT;

// Global variable for the MongoDB client.
let mongoClient = null;

/**
 * Connect to the MongoDB database and assign the global client.
 */
async function connectDB() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME, // Use dbName here instead of separate MongoClient
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB.");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
}

/**
 * Get an embedding for a given text using the OpenAI Embeddings API.
 */
async function getEmbedding(text) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: text,
        model: 'text-embedding-ada-002'
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    // Return the first embedding vector from the response.
    return response.data.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Call the Azure GPT‑4 API with conversation messages.
 */
async function callGPT4(messages) {
  try {
    const response = await axios.post(
      GPT4_ENDPOINT,
      {
        messages,
        max_tokens: 2000,
        temperature: 0.5
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": AZURE_API_KEY
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling GPT‑4:", error.response ? error.response.data : error.message);
    return "Error calling GPT‑4 API.";
  }
}

/**
 * Perform a vector search in MongoDB using Atlas Search's $search stage.
 */
async function searchMongo(queryEmbedding) {
  const collection = mongoose.connection.db.collection(process.env.COLLECTION_NAME);

  const pipelineAgg = [
    {
      $search: {
        index: process.env.SEARCH_INDEX_NAME,
        knnBeta: {
          vector: queryEmbedding,
          path: "embedding",
          k: 3
        }
      }
    },
    {
      $project: {
        sentence_chunk: 1,
        score: { $meta: "searchScore" }
      }
    }
  ];

  const results = await collection.aggregate(pipelineAgg).toArray();
  return results;
}


/**
 * POST /chat endpoint.
 * Expects JSON like:
 * { "question": "Your question", "history": [ { role: "user"|"assistant", content: "..." } ] }
 */
app.post("/chat", async (req, res) => {
  const { question, history = [] } = req.body;
  if (!question) {
    return res.status(400).json({ error: "No question provided." });
  }

  try {
    // Generate an embedding for the user's question using the OpenAI API.
    const queryEmbedding = await getEmbedding(question);

    // Perform vector search in MongoDB.
    const searchResults = await searchMongo(queryEmbedding);
    const legalContext = searchResults.map(doc => doc.sentence_chunk).join("\n\n");

    // Debug: Print the legal context to the console.
    if (!legalContext.trim()) {
      console.log("No legal context found. Check if your DB contains documents with 'sentence_chunk'.");
    } else {
      console.log("Legal Context:\n", legalContext);
    }

    // Build conversation messages for GPT‑4.
    const messages = [
      {
        role: "system",
        content:
          "You are a helpful legal assistant specialized in consumer rights. Use the provided legal context to answer the user's question."
      },
      {
        role: "system",
        content: `Legal Context:\n${legalContext}`
      },
      ...history,
      {
        role: "user",
        content: question
      }
    ];

    // Call the Azure GPT‑4 API.
    const answer = await callGPT4(messages);
    return res.json({ answer });
  } catch (error) {
    console.error("Error in /chat:", error);
    return res.status(500).json({ error: "Something went wrong." });
  }
});

app.use('/api/v1/users', userRoutes);

/**
 * Initialize the database connection, then start the server.
 */
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start the server:", err);
    process.exit(1);
  }
}

startServer();
