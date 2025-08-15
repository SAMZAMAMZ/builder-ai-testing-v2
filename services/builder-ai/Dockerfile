FROM node:18-alpine

# Install curl for GitHub downloads
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Force fresh install by adding timestamp
ARG BUILD_DATE=unknown
RUN echo "Build date: $BUILD_DATE" && npm install

# Copy the entire repository
COPY . .

# Change to the Builder-AI service directory
WORKDIR /app/services/builder-ai

# Force clean rebuild with timestamp
RUN echo "Rebuilding at: $BUILD_DATE" && rm -rf dist/ && npm run build

# Create directories for contracts
RUN mkdir -p /app/contracts /app/checklists

EXPOSE 8082

# Start the application from the correct directory
CMD ["node", "--max-old-space-size=2048", "--expose-gc", "dist/server.js"]
