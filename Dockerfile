# Use official Playwright Python image which has all browser binaries and system deps pre-installed
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose default port (overridden by Cloud Run's PORT env)
EXPOSE 3000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV ENV=production

# Run FastAPI server
CMD ["python", "main.py"]
