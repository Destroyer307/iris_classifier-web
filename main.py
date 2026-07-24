from pathlib import Path

import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from model import load_model, CLASS_NAMES

# ------------------------------------------------------------------
# Uygulama başlatma
# ------------------------------------------------------------------
app = FastAPI(
    title="Iris Classifier API",
    description="PyTorch ile eğitilmiş Iris çiçeği sınıflandırma modeli",
    version="1.0.0",
)

# CORS — geliştirme ortamında tüm originlere izin ver
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model yolu — iris_app klasörünün bir üstündeki models/ dizini
MODEL_PATH = Path(__file__).parent / "models" / "iris_model_classification_model.pth"

# Uygulama başlarken modeli yükle (startup event)
model = None

@app.on_event("startup")
async def startup_event():
    global model
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model dosyası bulunamadı: {MODEL_PATH}")
    model = load_model(MODEL_PATH)
    print(f"[OK] Model yuklendi: {MODEL_PATH}")


# ------------------------------------------------------------------
# Şemalar
# ------------------------------------------------------------------
class IrisFeatures(BaseModel):
    sepal_length: float = Field(..., ge=0.0, le=10.0, description="Sepal uzunluğu (cm)")
    sepal_width:  float = Field(..., ge=0.0, le=10.0, description="Sepal genişliği (cm)")
    petal_length: float = Field(..., ge=0.0, le=10.0, description="Petal uzunluğu (cm)")
    petal_width:  float = Field(..., ge=0.0, le=10.0, description="Petal genişliği (cm)")


class PredictionResponse(BaseModel):
    predicted_class: str
    class_index: int
    probabilities: dict[str, float]
    confidence: float


# ------------------------------------------------------------------
# Endpoint'ler
# ------------------------------------------------------------------
@app.get("/health")
async def health_check():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict", response_model=PredictionResponse)
async def predict(features: IrisFeatures):
    if model is None:
        raise HTTPException(status_code=503, detail="Model henüz yüklenmedi.")

    # Tensor oluştur
    x = torch.tensor(
        [[features.sepal_length, features.sepal_width, features.petal_length, features.petal_width]],
        dtype=torch.float32,
    )

    with torch.inference_mode():
        logits = model(x)                              # (1, 3)
        probs  = F.softmax(logits, dim=1).squeeze()   # (3,)
        pred_idx = probs.argmax().item()

    prob_dict = {CLASS_NAMES[i]: round(probs[i].item(), 6) for i in range(len(CLASS_NAMES))}

    return PredictionResponse(
        predicted_class=CLASS_NAMES[pred_idx],
        class_index=pred_idx,
        probabilities=prob_dict,
        confidence=round(probs[pred_idx].item(), 6),
    )


# ------------------------------------------------------------------
# Statik dosyalar — frontend'i serve et
# ------------------------------------------------------------------
STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def root():
    return FileResponse(STATIC_DIR / "index.html")
