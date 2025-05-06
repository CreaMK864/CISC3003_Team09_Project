#!/bin/bash

set -e

# Allow customizing project directory through environment variable or command line argument
if [ -n "$1" ]; then
  PROJECT_DIR="$1"
elif [ -n "$CHATBOT_PROJECT_DIR" ]; then
  PROJECT_DIR="$CHATBOT_PROJECT_DIR"
else
  PROJECT_DIR="/opt/chatbot-project"
fi

echo "Starting deployment process..."
echo "Using project directory: $PROJECT_DIR"

# Create project directory if it doesn't exist
mkdir -p $PROJECT_DIR

# Go to project directory
cd $PROJECT_DIR

# Pull latest code if needed
if [ -d "$PROJECT_DIR/.git" ]; then
  echo "Pulling latest code..."
  git pull
else
  echo "Cloning repository..."
  git clone https://github.com/CreaMK864/CISC3003_Team09_Project .
fi

# Make sure .env file exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo "ERROR: .env file not found! Please create it manually before deploying."
  exit 1
fi

# Bring down existing containers
echo "Stopping existing containers..."
docker compose down || true

# Start up containers with newest images
echo "Starting containers with new images..."
docker compose --project-directory ./ -f docker/production/docker-compose.yml --env-file docker/production/.env up --build --remove-orphans --detach

for i in {1..12}; do
  if curl -fsS http://localhost:3001/health; then
    exit 0
  fi
  sleep 5
done
echo "HEALTH CHECK FAILED"
docker compose logs

echo "Deployment completed successfully!"
exit 1
