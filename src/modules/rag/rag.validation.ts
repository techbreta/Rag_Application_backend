import Joi from "joi";

export const uploadDocument = {
  body: Joi.object().keys({
    fileUrl: Joi.string().uri().required().messages({
      "string.uri": "fileUrl must be a valid URL",
      "any.required": "fileUrl is required",
    }),
    fileName: Joi.string().required().trim().max(255).messages({
      "any.required": "fileName is required",
    }),
  }),
};

export const chat = {
  body: Joi.object()
    .keys({
      // Single document chat
      documentId: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .messages({
          "string.pattern.base": "documentId must be a valid MongoDB ObjectId",
        }),
      // Multi-document chat
      documentIds: Joi.array()
        .items(
          Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .messages({
              "string.pattern.base":
                "Each documentId must be a valid MongoDB ObjectId",
            }),
        )
        .min(1)
        .max(10)
        .messages({
          "array.min": "documentIds must contain at least 1 document",
          "array.max": "documentIds must contain at most 10 documents",
        }),
      // Chat type
      chatType: Joi.string()
        .valid("single-document", "multi-document", "all-documents")
        .default("single-document"),
      chatId: Joi.string()
        .optional()
        .regex(/^[0-9a-fA-F]{24}$/)
        .messages({
          "string.pattern.base": "chatId must be a valid MongoDB ObjectId",
        }),
      message: Joi.string().required().trim().min(1).max(5000).messages({
        "any.required": "message is required",
        "string.max": "message must be at most 5000 characters",
      }),
    })
    .custom((value, helpers) => {
      // Validation logic for different chat types
      const { documentId, documentIds, chatType, chatId } = value;

      // When continuing an existing chat, documentId/documentIds are resolved from the chat record
      if (chatId) {
        return value;
      }

      if (chatType === "single-document" && !documentId) {
        return helpers.message({
          custom: "documentId is required for single-document chat",
        });
      }

      if (
        chatType === "multi-document" &&
        (!documentIds || documentIds.length === 0)
      ) {
        return helpers.message({
          custom: "documentIds is required for multi-document chat",
        });
      }

      if (chatType === "all-documents" && (documentId || documentIds)) {
        return helpers.message({
          custom:
            "documentId and documentIds should not be provided for all-documents chat",
        });
      }

      return value;
    }),
};

export const search = {
  body: Joi.object()
    .keys({
      // Single document search
      documentId: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .messages({
          "string.pattern.base": "documentId must be a valid MongoDB ObjectId",
        }),
      // Multi-document search
      documentIds: Joi.array()
        .items(
          Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .messages({
              "string.pattern.base":
                "Each documentId must be a valid MongoDB ObjectId",
            }),
        )
        .min(1)
        .max(10)
        .messages({
          "array.min": "documentIds must contain at least 1 document",
          "array.max": "documentIds must contain at most 10 documents",
        }),
      query: Joi.string().required().trim().min(1).max(2000).messages({
        "any.required": "query is required",
      }),
      limit: Joi.number().integer().min(1).max(20).default(5),
    })
    .custom((value, helpers) => {
      const { documentId, documentIds } = value;

      if (!documentId && (!documentIds || documentIds.length === 0)) {
        return helpers.message({
          custom: "Either documentId or documentIds must be provided",
        });
      }

      if (documentId && documentIds) {
        return helpers.message({
          custom: "Provide either documentId or documentIds, not both",
        });
      }

      return value;
    }),
};

export const getDocument = {
  params: Joi.object().keys({
    documentId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
  }),
};

export const deleteDocument = {
  params: Joi.object().keys({
    documentId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
  }),
};

export const getChats = {
  params: Joi.object().keys({
    documentId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
  }),
};

export const getChat = {
  params: Joi.object().keys({
    chatId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
  }),
};

export const deleteChat = {
  params: Joi.object().keys({
    chatId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
  }),
};

export const generateImage = {
  body: Joi.object().keys({
    text: Joi.string().required().trim().min(10).max(2000).messages({
      "string.empty": "Image prompt cannot be empty",
      "string.min": "Image prompt must be at least 10 characters",
      "string.max": "Image prompt must not exceed 2000 characters",
      "any.required": "Image prompt (text) is required",
    }),
  }),
};

export const getImageById = {
  params: Joi.object().keys({
    imageId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/)
      .messages({
        "string.pattern.base": "imageId must be a valid MongoDB ObjectId",
      }),
  }),
};

export const deleteImageById = {
  params: Joi.object().keys({
    imageId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/)
      .messages({
        "string.pattern.base": "imageId must be a valid MongoDB ObjectId",
      }),
  }),
};

export const searchImages = {
  body: Joi.object().keys({
    limit: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .messages({
        "number.base": "Limit must be a number",
        "number.min": "Limit must be at least 1",
        "number.max": "Limit cannot exceed 50",
      }),
    page: Joi.number().integer().min(1).optional().default(1).messages({
      "number.base": "Page must be a number",
      "number.min": "Page must be at least 1",
    }),
  }),
};
