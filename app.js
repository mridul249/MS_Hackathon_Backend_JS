import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { MongoClient } from 'mongodb';
import { pipeline } from '@xenova/transformers';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = process.env.COLLECTION_NAME;
const SEARCH_INDEX_NAME = process.env.SEARCH_INDEX_NAME;

const AZURE_API_KEY = process.env.AZURE_API_KEY;
const GPT4_ENDPOINT = process.env.GPT4_ENDPOINT;

// Global variables for the model and MongoDB client.
let featureExtractionPipeline = null;
let mongoClient = null;

/**
 * Load the feature extraction pipeline once, when the server starts.
 * Here, we switch to a lighter model that supports quantization.
 */
async function loadModel() {
    console.log("Loading the feature extraction model (Alibaba-NLP/gte-base-en-v1.5)...");
    featureExtractionPipeline = await pipeline(
      "feature-extraction",
      "Alibaba-NLP/gte-base-en-v1.5",
      { quantized: false } // You can adjust this flag if a quantized version becomes available
    );
    console.log("Model loaded.");
  }
  
/**
 * Connect to the MongoDB database and assign the global client.
 */
async function connectDB() {
  console.log("Connecting to MongoDB...");
  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  console.log("Connected to MongoDB.");
}

/**
 * Average pool token embeddings to create a single embedding vector.
 */
function averagePool(embeddings) {
  const tokenCount = embeddings.length;
  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);
  for (const tokenEmb of embeddings) {
    for (let i = 0; i < dim; i++) {
      avg[i] += tokenEmb[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    avg[i] /= tokenCount;
  }
  return avg;
}

/**
 * Get an embedding for a given text using the in-memory model.
 */
async function getEmbedding(text) {
  // 'featureExtractionPipeline' is loaded once at startup.
  const output = await featureExtractionPipeline(text);
  // For sentence-transformers, pool token embeddings into a single vector:
  if (Array.isArray(output) && Array.isArray(output[0])) {
    return averagePool(output);
  }
  return output;
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
  const db = mongoClient.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  const pipelineAgg = [
    {
      $search: {
        index: SEARCH_INDEX_NAME,
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
    // Generate an embedding for the user's question using the in-memory pipeline.
    const queryEmbedding = await getEmbedding(question);

    // Perform vector search in MongoDB.
    const searchResults = await searchMongo(queryEmbedding);
    const legalContext = searchResults.map(doc => doc.sentence_chunk).join("\n\n");

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

/**
 * Initialize the model and database connection, then start the server.
 */
async function startServer() {
  try {
    await loadModel();
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
