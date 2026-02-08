# === Base build stage ===
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package.json ./
COPY yarn.lock ./
COPY tsconfig.json ./

# Copy source code
COPY ./src ./src

# Install all dependencies (including dev dependencies for building) 
RUN yarn install --frozen-lockfile

# Compile TypeScript
RUN yarn build


# === Production stage ===
FROM node:18-alpine AS production

# Install Chrome dependencies for Puppeteer
# Using Google Chrome stable instead of Chromium for better compatibility
RUN apk update && apk add --no-cache \
    # Basic dependencies
    udev \
    ttf-freefont \
    chromium \
    # Additional dependencies for Chrome
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    # Font dependencies
    font-noto-emoji \
    wqy-zenhei \
    && rm -rf /var/cache/apk/* /tmp/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV DOCKERIZED=true

# Create chromium-browser symlink if it doesn't exist
RUN if [ ! -f /usr/bin/chromium-browser ]; then \
    ln -s /usr/bin/chromium /usr/bin/chromium-browser; \
fi

WORKDIR /app
ENV NODE_ENV=production
    
# Copy package files
COPY package.json ./
COPY yarn.lock ./

# Install only production dependencies
RUN yarn install --production --frozen-lockfile

# Copy compiled output from base stage
COPY --from=base /app/dist ./dist

# Copy ecosystem config for PM2 if using PM2
COPY ecosystem.config.json ./

# Expose port (adjust if needed)
EXPOSE 3000

# Run the application
CMD ["node", "./dist/index.js"]
