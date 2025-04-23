#!/bin/bash

set -e

PROJECT_DIR="/opt/chatbot-project"

echo "Starting deployment process..."

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
docker compose up --build -d --remove-orphans

for i in {1..12}; do
  if curl -fsS http://localhost:3001/health; then
    exit 0
  fi
  sleep 5
done
echo "HEALTH CHECK FAILED"
docker compose logs
exit 1

echo "Deployment completed successfully!" 