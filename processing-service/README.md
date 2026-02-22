Processing service
------------------

This small service hosts heavy image-processing libraries (e.g. `@imgly/background-removal-node`) in a container so your main Vercel-hosted backend can remain lightweight.

Quick start (build and run locally):

```bash
cd processing-service
docker build -t processing-service:local .
docker run -p 5000:5000 --rm processing-service:local
```

Then point your main backend to `http://localhost:5000` using the `IMAGE_PROCESSING_URL` environment variable.

Deployment: push this image to your container registry (Docker Hub, GHCR, ECR) and run on a container host (Render, Fly, DigitalOcean, ECS, etc.).
