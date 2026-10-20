from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse
from pathlib import Path
import uuid

from app.config import settings
from app.services.ffmpeg_service import probe, process_video, save_upload, QSV_AVAILABLE

router = APIRouter(prefix="/video", tags=["video"])


@router.get("/capabilities")
async def capabilities():
    """Return what hardware acceleration is available."""
    return {
        "qsv": QSV_AVAILABLE,
        "encoder": "h264_qsv" if QSV_AVAILABLE else "libx264",
        "ffmpeg": settings.ffmpeg,
        "ffprobe": settings.ffprobe,
    }


@router.post("/probe")
async def probe_video(file: UploadFile = File(...)):
    """Upload a video and get its ffprobe metadata back."""
    data = await file.read()
    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    tmp = await save_upload(data, suffix)
    try:
        info = await probe(tmp)
    finally:
        tmp.unlink(missing_ok=True)
    return info


@router.post("/process")
async def process(
    file: UploadFile = File(...),
    resolution: str = Form("1080x1920"),   # TikTok portrait default
    crf: int = Form(23),
    preset: str = Form("fast"),
):
    """
    Upload a raw video, re-encode it (QSV or libx264),
    and return the processed file for download.
    """
    data = await file.read()
    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    input_path = await save_upload(data, suffix)
    output_path = settings.TEMP_DIR / f"out_{uuid.uuid4().hex}.mp4"

    try:
        await process_video(
            input_path, output_path,
            crf=crf, preset=preset, resolution=resolution,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        input_path.unlink(missing_ok=True)

    return FileResponse(
        path=output_path,
        media_type="video/mp4",
        filename="processed.mp4",
        background=None,   # file cleanup handled client-side or on next request
    )
