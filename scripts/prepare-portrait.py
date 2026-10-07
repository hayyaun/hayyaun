"""Offline AI video enhancement and matting. Models never run in the website."""
import argparse
import subprocess
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("--model", required=True, help="RVM MobileNetv3 FP32 ONNX")
parser.add_argument("--superres-model", required=True, help="FSRCNN_x2.pb")
parser.add_argument("--source", default="assets/me.mp4")
parser.add_argument("--output", default="public/portrait/v2")
parser.add_argument("--scratch", default="output/portrait/v2")
parser.add_argument("--pose", choices=["idle", "left", "middle", "right"])
args = parser.parse_args()
out, scratch = Path(args.output), Path(args.scratch)
out.mkdir(parents=True, exist_ok=True)
scratch.mkdir(parents=True, exist_ok=True)
cv2.setNumThreads(2)
options = ort.SessionOptions()
options.intra_op_num_threads = 2
session = ort.InferenceSession(args.model, options, providers=["CPUExecutionProvider"])
enhancer = cv2.dnn_superres.DnnSuperResImpl_create()
enhancer.readModel(args.superres_model)
enhancer.setModel("fsrcnn", 2)
# Source timestamps with stable poses and real blinks; no talking/head turns.
segments = {"idle": (5.2, 4.0), "left": (11.5, 4.8), "middle": (25.5, 5.0), "right": (40.5, 5.0)}
width, height, target = 800, 960, (960, 1152)
fps, overlap = 30, 0.2

for pose, (start, duration) in segments.items():
    if args.pose and args.pose != pose:
        continue
    states = [np.zeros((1, 1, 1, 1), dtype=np.float32) for _ in range(4)]
    lossless = scratch / f"{pose}.mkv"
    reader = subprocess.Popen([
        "ffmpeg", "-v", "error", "-ss", str(start), "-i", args.source,
        "-t", str(duration), "-vf", f"crop=1600:1920:1120:240,scale={width}:{height}:flags=lanczos,fps={fps}",
        "-an", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
    ], stdout=subprocess.PIPE)
    writer = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{target[0]}x{target[1]}", "-r", str(fps), "-i", "pipe:0",
        "-an", "-c:v", "ffv1", str(lossless),
    ], stdin=subprocess.PIPE)
    count = 0
    try:
        while True:
            data = reader.stdout.read(width * height * 3)
            if not data:
                break
            rgb = np.frombuffer(data, np.uint8).reshape(height, width, 3)
            src = rgb.transpose(2, 0, 1)[None].astype(np.float32) / 255
            # Warm the recurrent matte before exporting the first frame.
            for _ in range(3 if count == 0 else 1):
                foreground, alpha, *states = session.run(None, {
                    "src": src, "downsample_ratio": np.array([0.4], np.float32),
                    **{f"r{i + 1}i": state for i, state in enumerate(states)},
                })
            native = (np.clip(foreground[0].transpose(1, 2, 0), 0, 1) * 255).astype(np.uint8)
            # Learned super-resolution is applied to every video frame, consistently.
            enhanced = enhancer.upsample(cv2.cvtColor(native, cv2.COLOR_RGB2BGR))
            enhanced = cv2.cvtColor(cv2.resize(enhanced, target, interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
            matte = cv2.resize(alpha[0, 0], target, interpolation=cv2.INTER_LINEAR).clip(0, 1)
            if count == 6:
                rgba = np.dstack([enhanced, (matte * 255).astype(np.uint8)])
                Image.fromarray(rgba).save(out / f"{pose}.webp", quality=94, method=6)
                if pose == "idle":
                    baseline = cv2.resize(native, target, interpolation=cv2.INTER_LANCZOS4)
                    Image.fromarray(baseline).save(scratch / "native-comparison.png")
                    Image.fromarray(enhanced).save(scratch / "ai-comparison.png")
            white = (enhanced.astype(np.float32) * matte[..., None] + 255 * (1 - matte[..., None])).clip(0, 255).astype(np.uint8)
            writer.stdin.write(white.tobytes())
            count += 1
            if count % 30 == 0:
                print(f"{pose}: enhanced and matted {count} frames", flush=True)
    finally:
        reader.stdout.close()
        writer.stdin.close()
    if reader.wait() != 0 or writer.wait() != 0:
        raise RuntimeError(f"FFmpeg failed for {pose}")
    actual = count / fps
    # End on the same held pose as the start, without a visible looping jump.
    graph = (
        f"[0:v]split[body][head];"
        f"[body]trim=start={overlap},setpts=PTS-STARTPTS,settb=AVTB[body];"
        f"[head]trim=end={overlap},setpts=PTS-STARTPTS,settb=AVTB[head];"
        f"[body][head]xfade=transition=fade:duration={overlap}:offset={actual - 2 * overlap}[out]"
    )
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-i", str(lossless), "-filter_complex", graph,
        "-map", "[out]", "-an", "-r", str(fps), "-c:v", "libx264", "-crf", "17",
        "-preset", "medium", "-pix_fmt", "yuv420p", "-g", "30", "-movflags", "+faststart",
        str(out / f"{pose}.mp4"),
    ], check=True)
    print(f"Finished {pose}: {count} AI-enhanced frames at {target[0]}x{target[1]}", flush=True)
