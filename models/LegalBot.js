import mongoose from "mongoose";

const LegalBotSchema = new mongoose.Schema(
    {
      page_number:Number,
      sentence_chunk: String,
      chunk_char_count:Number,
      chunk_word_count:Number,
      chunk_token_count:Number,
      embedding: [Number], // or Array to be more flexible
    },
    {
      // Tells Mongoose to connect to an existing collection named legalBotCollection
      collection: 'legalBotCollection',
      // Optionally, turn strict mode off if your data is dynamic:
      strict: false
    }
  );

  export default mongoose.model("LegalBot", LegalBotSchema);