# Homepage portrait

`PortraitSkills` sits immediately after the hero. On a mouse, the upper left,
upper center, and upper right regions select DevOps, Animations, and Frontend.
The area over the face and the lower part of the section are neutral. Buttons
provide the same selection with keyboard focus and touch. Escape clears focus.
Skill names and technologies are server-rendered; mobile shows all descriptions.

The portrait uses actual footage from `assets/me.mp4`, including natural blinks
and recorded turns. `lib/portrait-motion.ts` defines the enter, hold, and return
ranges, relative to the source clip starting at 00:05. The latest selection wins
after the current turn returns to camera. A short snapshot fade smooths seeks.

The video loads only when the portrait is visible, pauses offscreen and in hidden
tabs, and stays unloaded under reduced motion or Save-Data. Unsupported video
frame callbacks or rejected autoplay leave the static portrait in place.

## Reproduce the assets

Requires FFmpeg, NumPy, Pillow, and ONNX Runtime **for offline processing only**.
Use the official MobileNetv3 FP32 weights from
[Robust Video Matting](https://github.com/PeterL1n/RobustVideoMatting).
The model and processing environment are not website dependencies or public assets.

```bash
mkdir -p output/portrait public/portrait
ffmpeg -i assets/me.mp4 -ss 5 -t 48 \
  -vf 'crop=1600:1920:1120:240,scale=480:576,fps=25' \
  -an -c:v libx264 -crf 18 -preset fast output/portrait/source.mp4
python3 scripts/prepare-portrait.py --model /path/to/rvm_mobilenetv3_fp32.onnx
ffmpeg -framerate 25 -i output/portrait/frames/%04d.png \
  -filter_complex 'color=c=white:s=480x576:r=25[bg];[bg][0:v]overlay=shortest=1:format=auto,format=yuv420p' \
  -an -c:v libx264 -crf 20 -preset slow -g 25 \
  -movflags +faststart public/portrait/portrait.mp4
python3 -c 'from PIL import Image; Image.open("output/portrait/frames/0050.png").save("public/portrait/poster.webp", quality=88, method=6)'
```

The matting model removes the curtain before encoding. MP4 is composited on white
for broad browser support; CSS multiply blending lets the white disappear into
the section's subtle background. The poster retains its alpha channel. Keep the
section background light; a dark theme would need a transparent video encoding
or another compositor. Intermediate RGBA frames remain ignored in `output/portrait`.
