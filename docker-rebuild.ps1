# Clean Docker rebuild script for Windows PowerShell

Write-Host "Cleaning Docker cache and rebuilding QMS backend..." -ForegroundColor Green

# Remove existing images and containers
docker stop qms-backend -ErrorAction SilentlyContinue
docker rm qms-backend -ErrorAction SilentlyContinue
docker rmi qms-backend -ErrorAction SilentlyContinue

# Clean build cache
docker builder prune -f

# Rebuild with no cache
docker build --no-cache -t qms-backend .

# Optional: Run the container to test
# docker run -p 3000:3000 --name qms-backend qms-backend

Write-Host "Rebuild complete!" -ForegroundColor Green
Write-Host "To run: docker run -p 3000:3000 --name qms-backend qms-backend" -ForegroundColor Yellow
