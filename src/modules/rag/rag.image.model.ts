import mongoose, { Model, Document } from "mongoose";

// ── Generated Image ────────────────────────────────────────────────
export interface IRagImage {
  userId: mongoose.Types.ObjectId;
  prompt: string;
  promptEmbedding: number[]; // Embedding of the generation prompt
  cloudinaryUrl: string; // Image URL from Cloudinary
  cloudinaryPublicId: string; // For deletion/management
  mistralFileId: string; // Original fileId from Mistral
  mistralConversationId: string; // For tracking the conversation
  metadata: {
    model: string; // e.g., "mistral-medium-2505"
    temperature?: number;
    generationTime?: number; // in milliseconds
  };
}

export interface IRagImageDoc extends IRagImage, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRagImageModel extends Model<IRagImageDoc> {}

// ── Schema ─────────────────────────────────────────────────────────
const ragImageSchema = new mongoose.Schema<IRagImageDoc, IRagImageModel>(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    promptEmbedding: {
      type: [Number],
      required: true,
      index: "2dsphere", // For similarity search
    },
    cloudinaryUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
      unique: true,
    },
    mistralFileId: {
      type: String,
      required: true,
    },
    mistralConversationId: {
      type: String,
      required: true,
    },
    metadata: {
      model: {
        type: String,
        default: "mistral-medium-2505",
      },
      temperature: {
        type: Number,
        default: 0.3,
      },
      generationTime: {
        type: Number, // milliseconds
      },
    },
  },
  {
    timestamps: true,
  },
);

// ── Compound Index for efficient queries ───────────────────────────
ragImageSchema.index({ userId: 1, createdAt: -1 });
ragImageSchema.index({ userId: 1, "metadata.model": 1 });

const RagImage = mongoose.model<IRagImageDoc, IRagImageModel>(
  "RagImage",
  ragImageSchema,
);

export default RagImage;
