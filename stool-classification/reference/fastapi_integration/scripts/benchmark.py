"""在部署 server 上量測單張推論延遲與記憶體。

用法：python scripts/benchmark.py <模型資料夾> <影像> [--runs 100] [--threads 1]
"""
import argparse
import resource
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from stool_classifier import StoolClassifier  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("model_dir")
ap.add_argument("image")
ap.add_argument("--runs", type=int, default=100)
ap.add_argument("--threads", type=int, default=1)
args = ap.parse_args()

t0 = time.perf_counter()
clf = StoolClassifier(args.model_dir, threads=args.threads)
load_s = time.perf_counter() - t0
data = Path(args.image).read_bytes()

for _ in range(10):  # 暖機
    clf.predict_bytes(data)

stages = {"decode": [], "preprocess": [], "inference": [], "total": []}
for _ in range(args.runs):
    t0 = time.perf_counter(); im = clf.decode(data)
    t1 = time.perf_counter(); x = clf.preprocess(im)
    t2 = time.perf_counter(); clf.session.run(None, {clf.input_name: x})
    t3 = time.perf_counter()
    for k, v in zip(stages, [t1 - t0, t2 - t1, t3 - t2, t3 - t0]):
        stages[k].append(v * 1000)

print(f"model: {clf.version}  threads={args.threads}  load={load_s:.2f}s")
print(f"image: {args.image} ({len(data) / 1024:.0f} KB)")
for k, v in stages.items():
    print(f"{k:>10}: p50={np.percentile(v, 50):7.2f} ms  p95={np.percentile(v, 95):7.2f} ms")
print(f"peak RSS: {resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024:.0f} MB")
