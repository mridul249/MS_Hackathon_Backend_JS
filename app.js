import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes.js";
import LegalBot from "./models/LegalBot.js";
import cookieParser from 'cookie-parser';
import Chat from "./models/Chat.js";
import authMiddleware from "./middlewares/authMiddleware.js";



const app = express();
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'https://legalbotiitp.netlify.app'], // Allows requests from specified origins
  credentials: true // Allows cookies to be sent
}));
app.use(cookieParser());

// In your main server file
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}


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
      "https://api.openai.com/v1/embeddings",
      {
        input: text,
        model: "text-embedding-ada-002",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );
    // Return the first embedding vector from the response.
    return response.data.data[0].embedding;
  } catch (error) {
    console.error(
      "Error generating embedding:",
      error.response ? error.response.data : error.message
    );
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
        temperature: 0.5,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": AZURE_API_KEY,
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(
      "Error calling GPT‑4:",
      error.response ? error.response.data : error.message
    );
    return "Error calling GPT‑4 API.";
  }
}

/**
 * Perform a vector search in MongoDB using Atlas Search's $search stage.
 */
export async function searchMongo(queryEmbedding) {
  try {

    const aggPipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 150,
          limit: 10
        }
      },
      {
        $project: {
          _id: 0,
          sentence_chunk: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];

    // Execute the aggregation with Mongoose
    const result = await LegalBot.aggregate(aggPipeline);

    // Log or return the results
    console.log('Search results:');
    result.forEach(doc => console.dir(JSON.stringify(doc, null, 2)));

    return result;
  } catch (error) {
    console.error('Error during search:', error);
    throw error;
  }
}
/**
 * POST /chat endpoint.
 * Expects JSON like:
 * { "question": "Your question", "history": [ { role: "user"|"assistant", content: "..." } ] }
 */
app.post("/chat/:chatId",authMiddleware, async (req, res) => {
  const { question, history = [] } = req.body;
  const chatId = req.params.chatId;
  if (!question) {
    return res.status(400).json({ error: "No question provided." });
  }

  try {
    // Generate an embedding for the user's question using the OpenAI API.
    const queryEmbedding = await getEmbedding(question);

    // Perform vector search in MongoDB.
    const searchResults = await searchMongo(queryEmbedding);
    const legalContext = searchResults
      .map((doc) => doc.sentence_chunk)
      .join("\n\n");

    // Debug: Print the legal context to the console.
    if (!legalContext.trim()) {
      console.log(
        "No legal context found. Check if your DB contains documents with 'sentence_chunk'."
      );
    } else {
      console.log("Legal Context:\n", legalContext);
    }

    // Build conversation messages for GPT‑4.
    const messages = [
      {
        role: "system",
        content:
          "You are a helpful legal assistant specialized in consumer rights. Use the provided legal context to answer the user's question.",
      },
      {
        role: "system",
        content: `Legal Context:\n${legalContext}`,
      },
      ...history,
      {
        role: "user",
        content: question,
      },
    ];

    // Call the Azure GPT‑4 API.
    const answer = await callGPT4(messages);



    await Chat.findOneAndUpdate(
      { _id: chatId, userId: req.user._id },
      { $push: { question: question, answer: answer } },
      { upsert: true, new: true }
    );

    return res.json({ answer });
  } catch (error) {
    console.error("Error in /chat:", error);
    return res.status(500).json({ error: "Something went wrong." });
  }
});


app.get("/chat/:chatId",authMiddleware, async (req, res) => {

  try {
    const chatId = req.params.chatId;
    const userId = req.user._id;

    // Retrieve the specific chat by chatId and userId
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      return res.status(404).json({ error: "Chat not found." });
    }

    // Retrieve all chat IDs for the current user
    const chats = await Chat.find({ userId }).select("_id");

    res.json({
      chat: { question: chat.question, answer: chat.answer },
      chatIds: chats.map(c => c._id)
    });
  } catch (error) {
    console.error("Error in GET /chat:", error);
    res.status(500).json({ error: "Something went wrong." });
  }

});
app.use("/api/v1/users", userRoutes);

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
