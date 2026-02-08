# Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the backend root directory with the following variables:

```bash
# ── Application Settings ──
NODE_ENV=development
PORT=3000

# ── Database ──
MONGODB_URL=mongodb://localhost:27017/rag-application

# ── JWT Configuration ──
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=30
JWT_RESET_PASSWORD_EXPIRATION_MINUTES=10
JWT_VERIFY_EMAIL_EXPIRATION_MINUTES=10

# ── AI/ML Service ──
MISTRAL_API_KEY=your-mistral-ai-api-key

# ── Email Configuration (Optional) ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourapp.com

# ── Client Configuration ──
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
```

## Setup Instructions

### 1. Get Mistral AI API Key

1. Go to [Mistral AI Console](https://console.mistral.ai/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

### 2. MongoDB Setup

**Option A: Local MongoDB**

```bash
# Install MongoDB locally or use Docker
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

**Option B: MongoDB Atlas (Recommended)**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get the connection string
4. Replace `MONGODB_URL` in your `.env`

**For Vector Search (Optional but Recommended):**
If using MongoDB Atlas, create a vector search index:

```javascript
// In MongoDB Atlas Console > Search > Create Search Index
{
  "name": "rag_vector_index",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 1024,
        "similarity": "cosine"
      },
      {
        "type": "filter",
        "path": "documentId"
      }
    ]
  }
}
```

### 3. Email Setup (Optional)

**Gmail Setup:**

1. Enable 2-factor authentication
2. Generate an App Password
3. Use the app password in `SMTP_PASSWORD`

**Other SMTP providers:**

- Update `SMTP_HOST`, `SMTP_PORT` accordingly
- Common ports: 587 (TLS), 465 (SSL), 25 (unsecured)

## Development vs Production

### Development (.env.development)

```bash
NODE_ENV=development
MONGODB_URL=mongodb://localhost:27017/rag-app-dev
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
```

### Production (.env.production)

```bash
NODE_ENV=production
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/rag-app-prod
CLIENT_URL=https://your-domain.com
FRONTEND_URL=https://app.your-domain.com

# Additional production settings
JWT_SECRET=much-longer-and-more-secure-secret-key-for-production
```

## Security Notes

⚠️ **Important Security Guidelines:**

1. **Never commit `.env` files to version control**
2. **Use strong JWT secrets (min 32 characters)**
3. **Rotate API keys regularly**
4. **Use different database URLs for dev/prod**
5. **Enable MongoDB authentication in production**

## Verification

Test your setup:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start in development
npm run dev
```

Check the console output for any missing environment variables or connection errors.
