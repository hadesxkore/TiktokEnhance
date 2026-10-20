from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import video

app = FastAPI(
    title="TikTok Video Processor",
    description="Local FFmpeg/FastAPI backend for video processing",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(video.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
