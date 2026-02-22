FROM node:18-slim
WORKDIR /usr/src/app

# Install system deps that sharp/onnxruntime may need (user may need to adjust)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    wget \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --production

COPY src ./src

EXPOSE 5000
CMD ["node", "src/index.js"]
