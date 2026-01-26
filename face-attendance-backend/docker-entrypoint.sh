#!/bin/sh
# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
MONGO_TIMEOUT=30
MONGO_ATTEMPT=0
while [ $MONGO_ATTEMPT -lt $MONGO_TIMEOUT ]; do
  if nc -z mongo 27017 > /dev/null 2>&1; then
    echo "MongoDB is ready!"
    break
  fi
  MONGO_ATTEMPT=$((MONGO_ATTEMPT + 1))
  sleep 1
done

if [ $MONGO_ATTEMPT -eq $MONGO_TIMEOUT ]; then
  echo "⚠ MongoDB startup timeout, continuing anyway..."
fi

# Run seed
echo "🌱 Running database seed..."
node src/seed.js || echo "⚠ Seed completed with warnings"

# Start the app
echo "🚀 Starting application..."
exec npm start
