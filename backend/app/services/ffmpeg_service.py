import asyncio
import json
import shutil
import uuid
from pathlib import Path

from app.config import settings


async def _run(cmd: list[str]) -> tuple[int, str, str]:
    """Run a subprocess and return (returncode, stdout, stderr)."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return proc.returncode, stdout.decode(), stderr.decode()


async def probe(file_path: Path) -> dict:
    """Return ffprobe JSON metadata for a video file."""
    cmd = [
        settings.ffprobe,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(file_path),
    ]
    code, out, err = await _run(cmd)
    if code != 0:
        raise RuntimeError(f"ffprobe failed: {err}")
    return json.loads(out)


def _qsv_available() -> bool:
    """Check whether Intel Quick Sync Video hardware encoder is available."""
    ffmpeg = shutil.which(settings.ffmpeg) or settings.ffmpeg
    import subprocess, shutil as sh
    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-encoders"],
        capture_output=True, text=True
    )
    return "h264_qsv" in result.stdout


QSV_AVAILABLE: bool = _qsv_available()


def _video_encoder() -> str:
    return "h264_qsv" if QSV_AVAILABLE else "libx264"


async def process_video(
    input_path: Path,
    output_path: Path,
    *,
    crf: int = 23,
    preset: str = "fast",
    resolution: str | None = None,   # e.g. "1080x1920" for portrait TikTok
) -> Path:
    """
    Re-encode a video with FFmpeg.
    Uses Intel QSV if available, otherwise falls back to libx264.
    """
    encoder = _video_encoder()
    cmd = [settings.ffmpeg, "-y", "-i", str(input_path)]

    if resolution:
        w, h = resolution.split("x")
        cmd += ["-vf", f"scale={w}:{h}"]

    if encoder == "h264_qsv":
        cmd += ["-c:v", "h264_qsv", "-global_quality", str(crf)]
    else:
        cmd += ["-c:v", "libx264", "-crf", str(crf), "-preset", preset]

    cmd += ["-c:a", "aac", "-b:a", "192k", str(output_path)]

    code, _, err = await _run(cmd)
    if code != 0:
        raise RuntimeError(f"ffmpeg failed: {err}")
    return output_path


async def save_upload(data: bytes, suffix: str = ".mp4") -> Path:
    """Save raw bytes to a unique temp file and return its path."""
    dest = settings.TEMP_DIR / f"{uuid.uuid4().hex}{suffix}"
    dest.write_bytes(data)
    return dest
