# Complete RAG Application API Documentation

This documentation covers the complete API for the RAG (Retrieval-Augmented Generation) application, including full authentication system and multi-document chat capabilities.

## 🚀 Base URL

```
http://localhost:3001
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Most endpoints require a valid access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Authentication Flow

1. **Register** → Create new account
2. **Login** → Get access & refresh tokens
3. **Use API** → Include access token in requests
4. **Refresh** → Get new tokens when access token expires
5. **Logout** → Invalidate refresh token

---

## 📋 API Endpoints

### 🔐 Authentication Endpoints

#### 1. Register User

**POST** `/v1/auth/register`

Create a new user account.

**Request Body:**

```json
{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

**Response (201):**

```json
{
  "user": {
    "id": "user_id",
    "email": "test@example.com",
    "name": "Test User",
    "role": "user",
    "isEmailVerified": false
  },
  "tokens": {
    "access": {
      "token": "access_token",
      "expires": "2024-01-01T10:00:00.000Z"
    },
    "refresh": {
      "token": "refresh_token",
      "expires": "2024-01-30T10:00:00.000Z"
    }
  }
}
```

#### 2. Login User

**POST** `/v1/auth/login`

Authenticate user and get tokens.

**Request Body:**

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response (200):** Same as register response

#### 3. Refresh Tokens

**POST** `/v1/auth/refresh-tokens`

Get new access and refresh tokens.

**Request Body:**

```json
{
  "refreshToken": "current_refresh_token"
}
```

**Response (200):**

```json
{
  "access": {
    "token": "new_access_token",
    "expires": "2024-01-01T11:00:00.000Z"
  },
  "refresh": {
    "token": "new_refresh_token",
    "expires": "2024-01-30T11:00:00.000Z"
  }
}
```

#### 4. Logout

**POST** `/v1/auth/logout`

Invalidate refresh token and logout user.

**Request Body:**

```json
{
  "refreshToken": "current_refresh_token"
}
```

**Response (204):** No content

#### 5. Forgot Password

**POST** `/v1/auth/forgot-password`

Send password reset email.

**Request Body:**

```json
{
  "email": "test@example.com"
}
```

**Response (204):** No content

#### 6. Reset Password

**POST** `/v1/auth/reset-password?token=reset_token`

Reset password using token from email.

**Query Parameters:**

- `token` - Password reset token from email

**Request Body:**

```json
{
  "password": "newpassword123"
}
```

**Response (204):** No content

#### 7. Send Verification Email

**POST** `/v1/auth/send-verification-email`

🔒 **Requires Authentication**

Send email verification link to authenticated user.

**Response (204):** No content

#### 8. Verify Email

**POST** `/v1/auth/verify-email?token=verification_token`

Verify user email using token.

**Query Parameters:**

- `token` - Email verification token

**Response (204):** No content

---

### 👤 User Management Endpoints

#### 1. Get Current User

**GET** `/v1/users/me`

🔒 **Requires Authentication**

Get current authenticated user information.

**Response (200):**

```json
{
  "id": "user_id",
  "email": "test@example.com",
  "name": "Test User",
  "role": "user",
  "isEmailVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Update Current User

**PATCH** `/v1/users/me`

🔒 **Requires Authentication**

Update current user's profile information.

**Request Body:**

```json
{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

**Response (200):** Updated user object

#### 3. Delete Current User

**DELETE** `/v1/users/me`

🔒 **Requires Authentication**

Delete current user account.

**Response (204):** No content

---

### 📄 Document Management Endpoints

#### 1. Upload Document

**POST** `/v1/rag/upload`

🔒 **Requires Authentication**

Upload a document (PDF, DOCX, TXT) for processing and indexing.

**Request Body:**

```json
{
  "fileUrl": "https://example.com/document.pdf",
  "fileName": "Research Paper.pdf"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Document uploaded and processed successfully",
  "data": {
    "document": {
      "_id": "document_id",
      "fileName": "Research Paper.pdf",
      "originalName": "Research Paper.pdf",
      "fileSize": 1024000,
      "mimeType": "application/pdf",
      "uploadedBy": "user_id",
      "processingStatus": "completed",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "chunks": 15,
    "embeddings": 15
  }
}
```

#### 2. List User Documents

**GET** `/v1/rag/documents?page=1&limit=10`

🔒 **Requires Authentication**

Get paginated list of uploaded documents.

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "_id": "document_id",
        "fileName": "Research Paper.pdf",
        "fileSize": 1024000,
        "mimeType": "application/pdf",
        "processingStatus": "completed",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "totalResults": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

#### 3. Get Document Details

**GET** `/v1/rag/documents/{documentId}`

🔒 **Requires Authentication**

Get details of a specific document.

**Response (200):** Single document object with full details

#### 4. Delete Document

**DELETE** `/v1/rag/documents/{documentId}`

🔒 **Requires Authentication**

Delete a document and its embeddings.

**Response (200):**

```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

### 🤖 RAG Chat Endpoints

#### 1. Chat with Documents

**POST** `/v1/rag/chat`

🔒 **Requires Authentication**

Chat with documents using three different modes:

##### Single Document Chat

```json
{
  "message": "What is the main topic of this document?",
  "documentId": "document_id",
  "chatType": "single"
}
```

##### Multiple Documents Chat

```json
{
  "message": "Compare the key concepts between these documents",
  "documentIds": ["doc_id_1", "doc_id_2"],
  "chatType": "multiple"
}
```

##### All Documents Chat

```json
{
  "message": "Summarize all information across my documents",
  "chatType": "all"
}
```

##### Continue Existing Chat

```json
{
  "message": "Can you provide more details?",
  "chatId": "existing_chat_id"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "chatId": "chat_session_id",
    "response": "AI generated response based on the documents",
    "sources": [
      {
        "documentId": "doc_id",
        "documentName": "Research Paper.pdf",
        "relevantChunk": "Relevant text from document...",
        "similarity": 0.85
      }
    ],
    "chatType": "single",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 📊 Chat History Endpoints

#### 1. Get Chat Sessions

**GET** `/v1/rag/chats?page=1&limit=10`

🔒 **Requires Authentication**

Get paginated list of chat sessions.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "chats": [
      {
        "_id": "chat_id",
        "chatType": "single",
        "documentId": "doc_id",
        "lastMessage": "What is this about?",
        "lastResponse": "This document discusses...",
        "messageCount": 3,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "totalResults": 1
    }
  }
}
```

#### 2. Get Chat Session Details

**GET** `/v1/rag/chats/{chatId}`

🔒 **Requires Authentication**

Get full chat history and details.

**Response (200):**

```json
{
    "success": true,
    "data": {
        "_id": "chat_id",
        "chatType": "single",
        "documentId": "doc_id",
        "userId": "user_id",
        "messages": [
            {
                "role": "user",
                "content": "What is this document about?",
                "timestamp": "2024-01-01T00:00:00.000Z"
            },
            {
                "role": "assistant",
                "content": "This document discusses...",
                "sources": [...],
                "timestamp": "2024-01-01T00:00:30.000Z"
            }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z"
    }
}
```

#### 3. Delete Chat Session

**DELETE** `/v1/rag/chats/{chatId}`

🔒 **Requires Authentication**

Delete a chat session.

**Response (200):**

```json
{
  "success": true,
  "message": "Chat session deleted successfully"
}
```

---

## 🚀 Getting Started

### 1. Environment Setup

Create a `.env` file:

```env
NODE_ENV=development
PORT=3001
MONGODB_URL=mongodb://localhost:27017/rag-app
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=30
JWT_RESET_PASSWORD_EXPIRATION_MINUTES=10
JWT_VERIFY_EMAIL_EXPIRATION_MINUTES=10
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
MISTRAL_API_KEY=your-mistral-api-key
```

### 2. MongoDB Atlas Vector Search Setup

Create a vector search index named `vector_index` on your `embeddings` collection:

```javascript
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

---

## 📝 Authentication Flow Example

```javascript
// 1. Register
const registerResponse = await fetch("/v1/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "password123",
    name: "Test User",
  }),
});

const { tokens } = await registerResponse.json();

// 2. Use API with token
const documentsResponse = await fetch("/v1/rag/documents", {
  headers: {
    Authorization: `Bearer ${tokens.access.token}`,
  },
});

// 3. Refresh token when needed
const refreshResponse = await fetch("/v1/auth/refresh-tokens", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    refreshToken: tokens.refresh.token,
  }),
});
```

---

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt with salt rounds
- **Email Verification** - Confirm user email addresses
- **Password Reset** - Secure password recovery flow
- **Rate Limiting** - API endpoint protection
- **Input Validation** - Comprehensive request validation
- **CORS Protection** - Cross-origin request security

---

## 📊 Multi-Document Chat Features

### Chat Types

1. **Single Document** (`chatType: "single"`)

   - Chat with one specific document
   - Requires `documentId`

2. **Multiple Documents** (`chatType: "multiple"`)

   - Chat with up to 10 specific documents
   - Requires `documentIds` array
   - Cross-references information between documents

3. **All Documents** (`chatType: "all"`)
   - Chat with entire document library
   - No document IDs required
   - Searches across all user documents

### Smart Context Management

- **Conversation History** - Maintains context across messages
- **Source Attribution** - Shows which documents provided answers
- **Relevance Scoring** - Ranks document chunks by similarity
- **Cross-Document Analysis** - Identifies connections between documents

---

## 🎯 Postman Collection

Import the `Complete_API.postman_collection.json` file into Postman to get:

- ✅ All authentication endpoints
- ✅ Complete user management
- ✅ Document upload & management
- ✅ Multi-document chat functionality
- ✅ Chat history management
- ✅ Automatic token handling
- ✅ Environment variables setup
- ✅ Request examples & descriptions

### Environment Variables

Set these in your Postman environment:

- `baseUrl` - API base URL (auto-set to `http://localhost:3001`)
- `authToken` - Access token (auto-set on login)
- `refreshToken` - Refresh token (auto-set on login)
- `userId` - User ID (auto-set on login)
- `documentId` - Document ID (auto-set on upload)
- `chatId` - Chat session ID (auto-set on chat)

---

## 🛠️ Error Handling

All endpoints return consistent error responses:

```json
{
  "code": 400,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## 🚀 Next Steps

1. **Import Postman Collection** - Use `Complete_API.postman_collection.json`
2. **Set Environment Variables** - Configure your Postman environment
3. **Test Authentication Flow** - Register → Login → Use API
4. **Upload Documents** - Add PDFs, DOCX, or TXT files
5. **Start Chatting** - Try single, multiple, or all document chats
6. **Explore Features** - Test all endpoints and chat types

The API is now ready for frontend integration and production use! 🎉
