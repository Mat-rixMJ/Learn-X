@echo off
echo Building Docker images for Learn-X platform...

echo Building backend image...
cd backend
docker build -t learn-x-backend -f Dockerfile.dev .

echo Building frontend image...
cd ../frontend
docker build -t learn-x-frontend -f Dockerfile.dev .

echo All images built successfully!
cd ..
