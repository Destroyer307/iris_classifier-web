import torch
import torch.nn as nn
from pathlib import Path

# -----------------------------------------------------------
# Model mimarisi — eğitimde kullanılanla birebir aynı olmalı
# -----------------------------------------------------------
class MultiClassModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.layer = nn.Sequential(
            nn.Linear(4, 12),
            nn.ReLU(),
            nn.Linear(12, 12),
            nn.ReLU(),
            nn.Linear(12, 3),
        )

    def forward(self, x):
        return self.layer(x)


# Sınıf isimleri (Iris dataset standart sırası)
CLASS_NAMES = ["Iris-setosa", "Iris-versicolor", "Iris-virginica"]

# Model yükleyici — uygulama başlarken bir kez çağrılır
def load_model(model_path: str | Path) -> MultiClassModel:
    model = MultiClassModel()
    state_dict = torch.load(model_path, map_location=torch.device("cpu"), weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()
    return model
