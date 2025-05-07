FROM node:22-alpine

WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the port
EXPOSE 3000

# Start the application in development mode
# In production, you would use:
# RUN npm run build
# CMD ["npm", "start"]
CMD ["npm", "run", "dev"]