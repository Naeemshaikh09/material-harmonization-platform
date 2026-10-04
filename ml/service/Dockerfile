# Extraction service Docker image
# CPU-only by default. For GPU, change base image to pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY ml/service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy service source
COPY ml/ /app/ml/
COPY data/ /app/data/
COPY contracts/ /app/contracts/

# Environment variables with defaults
# MODEL_PATH: path to fine-tuned model weights (leave empty for rules-only mode)
ENV MODEL_PATH=""
ENV MODEL_TYPE="seq2seq"
ENV MODEL_VERSION="slm-v1"
ENV CONFIDENCE_THRESHOLD="0.50"
ENV TERMINOLOGY_DICT_PATH="/app/data/dictionaries/terminology.json"
ENV TEMPLATES_DIR="/app/data/templates"
ENV CODE_TABLES_DIR="/app/data/code_tables"

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8001/health').raise_for_status()"

# Run the service
CMD ["uvicorn", "ml.service.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
