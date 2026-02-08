import mongoose from 'mongoose';
import { IRagDocumentDoc, IRagDocumentModel } from './rag.interfaces';

const ragDocumentSchema = new mongoose.Schema<IRagDocumentDoc, IRagDocumentModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ['pdf', 'webpage'],
      default: 'pdf',
    },
    totalChunks: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
    },
    errorMessage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const RagDocument = mongoose.model<IRagDocumentDoc, IRagDocumentModel>('RagDocument', ragDocumentSchema);

export default RagDocument;
