# Docker Images Push Guide

## byzer-storage

This section describes how to use the Docker image built from `@docker/byzer-storage/Dockerfile`.

The byzer-storage image is based on Ubuntu 22.04 and includes:
- Python 3.10.11 via Miniconda
- auto-coder package
- python-multipart package

### Building and Pushing

To build and push this image:

```bash
# Navigate to the directory containing the Dockerfile
cd docker/base

# Build the image
docker build -t byzer-storage:latest .

# Tag the image for your registry
docker tag byzer-storage:latest your-registry/byzer-storage:latest

# Push to your registry
docker push your-registry/byzer-storage:latest
```

### Usage

This image provides a base environment with auto-coder installed and can be used as follows:

```bash
docker run -it your-registry/byzer-storage:latest
```

You can activate the Python environment with:

```bash
conda activate py310
```