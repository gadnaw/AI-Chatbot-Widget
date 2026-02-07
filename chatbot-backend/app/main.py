# chatbot-backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: set up resources
    yield
    # Shutdown: clean up resources


app = FastAPI(
    title="A4 AI Chatbot API",
    description="API for embeddable AI chatbot widget",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


from app.api import chat, health, widget

app.include_router(chat.router, prefix="/api/v1")
app.include_router(health.router)
app.include_router(widget.router)
