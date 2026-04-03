FROM python:3.11-slim

# Install system dependencies (compilers, nodejs, java)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    nodejs \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
