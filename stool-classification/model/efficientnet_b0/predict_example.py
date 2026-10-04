"""用法：python predict_example.py <影像路徑>"""
import json, sys
from pathlib import Path
import numpy as np
import onnxruntime as ort
from preprocess import load_image, preprocess

here = Path(__file__).parent
meta = json.loads((here / "model_meta.json").read_text(encoding="utf-8"))
sess = ort.InferenceSession(str(here / "model.onnx"), providers=["CPUExecutionProvider"])
probs = sess.run(None, {meta["input"]["name"]: preprocess(load_image(sys.argv[1]), meta)})[0][0]
i = int(np.argmax(probs))
low = float(probs[i]) < meta["low_confidence_threshold"]
print(json.dumps({
    "label": None if low else meta["class_order"][i],
    "confidence": round(float(probs[i]), 4),
    "low_confidence": low,
    "probs": {c: round(float(p), 4) for c, p in zip(meta["class_order"], probs)},
    "model_version": meta["model_version"],
}, ensure_ascii=False, indent=2))
