# Docker Push Guide

## byzer-storage

This guide explains how to use the byzer-storage Docker image.

### Image Information

The byzer-storage Docker image is based on Ubuntu 22.04 and includes:
- Miniconda with Python 3.10.11
- auto-coder package
- python-multipart package

### Usage

To use this image:

```bash
# Pull the image
docker pull [repository]/byzer-storage:latest

# Run a container
docker run -it [repository]/byzer-storage:latest
```

### Building the Image

To build the image locally:

```bash
cd /path/to/auto-coder.web
docker build -f docker/base/Dockerfile -t byzer-storage:latest .
```

### Configuration

The image is configured with:
- Python 3.10.11 in a conda environment named 'py310'
- PIP configured to use Tsinghua mirror
- auto-coder and python-multipart packages pre-installed