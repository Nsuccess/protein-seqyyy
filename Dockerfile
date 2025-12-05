# Root Dockerfile for Railway deployment
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/ .

# Create data directories
RUN mkdir -p /app/data/raw

# Copy only the small data file that's in git
COPY data/raw/genage_human.csv /app/data/raw/genage_human.csv

# Copy Mol-Instructions aging-filtered sample (~8MB, 5K aging-relevant examples)
COPY data/mol_instructions_sample /app/data/mol_instructions_sample

# Create empty theory file with proper structure (app expects dict with metadata and mapped_theories)
RUN echo '{"metadata": {}, "mapped_theories": []}' > /app/data/stage1_5_llm_mapped.json

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
