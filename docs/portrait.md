# Homepage portrait

`PortraitSkills` sits immediately after the hero. Only hovering the actual DevOps,
Animations, and Frontend cards selects a pose. The surrounding section has no
pointer tracking. Keyboard focus and touch provide the same selection. Escape
clears keyboard selection. Mouse clicks do not pin cards open.
Skill names and technologies are server-rendered; mobile shows all descriptions.

The portrait uses the original 4K footage from `assets/me.mp4`, including natural
blinks and body movement. Four held-pose loops and six recorded turn clips are
buffered when the portrait enters view. Selecting a card plays the recorded turn
from center before entering the held pose. Leaving plays the recorded return.
Switching between cards returns through center. A turn finishes at normal speed;
only the latest requested target is retained, so rapid hovering cannot accumulate
a queue of turns. Only one video plays at a time. An 80ms fade starts after the
next clip has a decoded frame, keeping the prior frame visible during buffering.
Late playback promises cannot restart an obsolete clip. Held-loop seam fades
are encoded offline.

Videos load only when the portrait is visible, pause offscreen and in hidden tabs,
and stay unloaded under reduced motion or Save-Data. Each pose has a matching
high-resolution still while its first frame loads or if autoplay is rejected.
Reduced motion keeps the centered still. AI inference never runs in the browser.

## Reproduce the assets

Requires FFmpeg, NumPy, Pillow, ONNX Runtime, and opencv-contrib-python-headless
**for offline processing only**. Use the official MobileNetv3 FP32 weights from
[Robust Video Matting](https://github.com/PeterL1n/RobustVideoMatting).
Use `models/FSRCNN_x2.pb` from [FSRCNN TensorFlow](https://github.com/Saafke/FSRCNN_Tensorflow)
for neural super-resolution. Every frame receives the same learned enhancement;
the pipeline preserves the recorded face and motion rather than generating poses.
It crops at 800×960 from the 4K original, applies RVM matting and 2× FSRCNN,
then exports at 960×1152 and 30 fps with CRF 17 compression. The prior export was
480×576 at 25 fps. The model files and processing environment are not website
dependencies or public assets.

```bash
python3 scripts/prepare-portrait.py \
  --model /path/to/rvm_mobilenetv3_fp32.onnx \
  --superres-model /path/to/FSRCNN_x2.pb
# Optional: export one pose using --pose idle|left|middle|right.
# Recorded turns: repeat for left-in, left-out, middle-in, middle-out, right-in, right-out.
python3 scripts/prepare-portrait.py \
  --model /path/to/rvm_mobilenetv3_fp32.onnx \
  --superres-model /path/to/FSRCNN_x2.pb \
  --turn left-in --output public/portrait/turns \
  --scratch output/portrait/turns/frames
```

The matting model removes the curtain before encoding. MP4 is composited on white
for broad browser support; CSS multiply blending lets the white disappear into
the section's subtle background. The poster retains its alpha channel. Keep the
section background light; a dark theme would need a transparent video encoding
or another compositor. Intermediate lossless clips and comparisons remain ignored
in `output/portrait`. Held assets are in `public/portrait/v2`; turns are in
`public/portrait/turns`. The script records the source cut points. All clips use
the same crop, scale, matting, and enhancement; no face or motion is generated.

Desktop side cards sit 90px higher to match the recorded upward glance. The
ring's lower arc fades out before the hands fade, avoiding a visible line through
the hands. Mobile cards remain stacked below the portrait.
