from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Chatbot API")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

def main():
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
