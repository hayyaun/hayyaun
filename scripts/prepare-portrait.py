"""Offline video matting; see docs/portrait.md. No model runs in the browser."""
import argparse
import subprocess
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("--model", required=True)
parser.add_argument("--input", default="output/portrait/source.mp4")
parser.add_argument("--output", default="output/portrait/frames")
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
options = ort.SessionOptions()
options.intra_op_num_threads = 4
session = ort.InferenceSession(args.model, options, providers=["CPUExecutionProvider"])
states = [np.zeros((1, 1, 1, 1), dtype=np.float32) for _ in range(4)]
reader = subprocess.Popen([
    "ffmpeg", "-v", "error", "-i", args.input, "-f", "rawvideo",
    "-pix_fmt", "rgb24", "pipe:1",
], stdout=subprocess.PIPE)
index = 0
while True:
    data = reader.stdout.read(480 * 576 * 3)
    if not data:
        break
    rgb = np.frombuffer(data, dtype=np.uint8).reshape(576, 480, 3)
    src = rgb.transpose(2, 0, 1)[None].astype(np.float32) / 255
    foreground, alpha, *states = session.run(None, {
        "src": src, "downsample_ratio": np.array([0.5], np.float32),
        **{f"r{i + 1}i": state for i, state in enumerate(states)},
    })
    # Keep the model's decontaminated foreground at soft hair/skin edges.
    rgba = np.concatenate([foreground[0], alpha[0]], axis=0).transpose(1, 2, 0)
    rgba = (np.clip(rgba, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(rgba).save(out / f"{index:04d}.png", compress_level=1)
    if index % 100 == 0:
        print(f"Matted {index} frames", flush=True)
    index += 1
if reader.wait() != 0:
    raise RuntimeError("FFmpeg decoding failed")
print(f"Finished {index} frames", flush=True)
