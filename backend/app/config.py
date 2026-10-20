from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import shutil


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173"

    # Leave blank to auto-detect from PATH
    FFMPEG_PATH: str = ""
    FFPROBE_PATH: str = ""

    TEMP_DIR: Path = Path("./tmp")

    @property
    def ffmpeg(self) -> str:
        return self.FFMPEG_PATH or shutil.which("ffmpeg") or "ffmpeg"

    @property
    def ffprobe(self) -> str:
        return self.FFPROBE_PATH or shutil.which("ffprobe") or "ffprobe"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
