# Use an official Node.js runtime as a parent image
FROM node:22-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
ARG NODE_ENV=production
RUN if [ "$NODE_ENV" = "production" ]; then npm ci --omit=dev; else npm ci; fi

# Copy the rest of the application's source code
COPY . .

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Run index.js when the container launches
CMD ["node", "src/index.js"]
