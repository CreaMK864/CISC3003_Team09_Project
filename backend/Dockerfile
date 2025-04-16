FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
COPY main.py .

# Install dependencies
RUN pip install --no-cache-dir ".[dev]"

EXPOSE 8000

CMD ["python", "main.py"]
