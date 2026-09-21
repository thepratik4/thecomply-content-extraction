"""Convenience script to start the ExtractAI FastAPI server."""
import uvicorn

if __name__ == "__main__":
    print("Starting ExtractAI FastAPI server on http://localhost:8000 ...")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
