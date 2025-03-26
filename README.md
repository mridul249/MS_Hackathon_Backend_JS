# Legal Bot Backend

A Node.js backend service for a legal assistance chatbot that uses AI to provide legal information and answers based on legal documents.

## Features

- User Authentication System
  - Sign up with email verification
  - Login with JWT authentication
  - Password reset functionality
  - OTP verification system

- Chat System
  - Vector-based legal document search
  - Integration with GPT-4 for intelligent responses
  - Chat history management
  - Context-aware responses

- Security Features
  - JWT-based authentication
  - HTTP-only cookies
  - Password hashing
  - OTP expiration

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **AI/ML**: 
  - OpenAI's GPT-4 (Azure)
  - Text embeddings (text-embedding-ada-002)
- **Email**: Nodemailer
- **Authentication**: JWT, Bcrypt
- **Other**: CORS, Cookie-Parser

## Prerequisites

- Node.js (Latest LTS version)
- MongoDB instance
- Azure OpenAI API access
- Gmail account for email service

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
DB_NAME=your_database_name
COLLECTION_NAME=your_collection_name
SEARCH_INDEX_NAME=vector_index
AZURE_API_KEY=your_azure_api_key
GPT4_ENDPOINT=your_gpt4_endpoint
GMAIL_USER=your_gmail
GMAIL_PASS=your_gmail_app_password
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
```
2.Move to root directory:
 ```bash
cd MS_Hackathon_Backend_JS
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```


## MongoDB Vector Search

The system uses MongoDB's vector search capabilities to find relevant legal information. Make sure to set up the following:

1. Vector index for embeddings
2. Proper collection structure for legal documents
3. Embedding generation for legal text chunks
