# Docker Push Guide

## byzer-storage

This Docker image is based on Ubuntu 22.04 and includes:

- Python 3.10.11 (via Miniconda)
- auto-coder package
- python-multipart package

### Building the image

```bash
cd docker/base
docker build -t byzer-storage .
```

### Pushing to Docker Hub

```bash
# Tag the image
docker tag byzer-storage username/byzer-storage:latest

# Push to Docker Hub
docker push username/byzer-storage:latest
```

### Usage

```bash
docker run -it byzer-storage
```

This container provides a Python environment with auto-coder pre-installed.