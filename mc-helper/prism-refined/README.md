# Refined Blender prism

Open `prism-studio.blend`. The object is named **Rounded Triangular Prism**. `prism-final.png` is the full-size Cycles render. The original scene is preserved in `before-refinement.blend`.

The model is a closed triangular solid with rounded corners, broad curved shoulders, a thick base, filled slightly convex front/back faces, and a tapered rear outline. The studio collection contains a seamless lavender stage, camera, lights, and reflection cards. The original camera/light remain in the scene; the original light is excluded from rendering.

The material is deliberately stylized: central surfaces transmit as glass, while curved shoulders receive an enhanced reflective contribution. The stage is hidden from glossy rays to keep the foot from reflecting a uniformly white floor. This is an approximation of the supplied reference, not an exact reconstruction or a calibrated optical-glass simulation. Reflection shapes and some contour details still differ.

## Checks

`mesh-validation.json` records a closed manifold mesh with 18,482 vertices, 18,720 faces, zero boundary/non-manifold edges, positive volume, and outward front/back normals. The render uses a smoothing modifier, Cycles, denoising, 981 × 793 pixels, and 96 samples.

## Commands and state changes

All local operations used the existing Blender add-on on `127.0.0.1:9876`. After the app resume the direct MCP tools were unavailable, so `blender-bridge.ps1` sends the same add-on commands through that local socket.

Read-only inspection commands included:

```powershell
Get-ChildItem -LiteralPath '\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-refined' | Select-Object Name,Length,LastWriteTime
rg -n -A 65 -B 8 'def handle_client|def execute_command|def execute_code|get_scene_info|9876' 'C:\Users\Hayyaun\AppData\Roaming\Blender Foundation\Blender\5.2\scripts\addons\blender_mcp.py'
Get-Content -LiteralPath '\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-refined\render-final.log' -Tail 8
```

The bridge was loaded with:

```powershell
. '\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-refined\blender-bridge.ps1'
Invoke-PrismBlender -Command 'get_addon_info'
Invoke-PrismBlender -Command 'get_scene_info'
Invoke-PrismBlender -Command 'execute_code' -Params @{code=$prismCode}
Invoke-PrismBlender -Command 'get_viewport_screenshot' -Params @{max_size=1000;filepath='\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-refined\viewport-check.png'}
```

`execute_code` **changed Blender scene state**: mesh geometry and material nodes, reflection-card objects, light power, the studio camera, stage ray visibility, viewport overlays, Cycles settings, sampling/resolution, and the active saved file path. The supplied `.py` files retain the major construction/refinement scripts; the `.blend` is the authoritative complete scene. `Set-Content` saved those scripts and this note. Preview images and logs were written in this folder. No website source files were changed.

The background render command was:

```text
"C:\Program Files\WindowsApps\BlenderFoundation.Blender_5.2.2.0_x64__ppwjx1n5r4v9t\Blender\blender.exe" -b \\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-refined\prism-studio.blend -t 8 --python-expr "import bpy; bpy.ops.render.render(write_still=True)"
```

Background render processes were launched with `CREATE_NO_WINDOW`; they do not replace or close the interactive Blender instance. Scene saves used `bpy.ops.wm.save_as_mainfile`, with `copy=True` for the initial backup.

## Completed verification

The full 981 × 793 Cycles render completed successfully and was visually inspected against the reference. Its log records an elapsed render time of 5 minutes 38.860 seconds.

The live add-on completed the previously delayed evaluated-mesh check. `evaluated-mesh-validation.json` confirms 74,402 vertices and 74,400 faces at viewport subdivision level 1, zero boundary edges, zero non-manifold edges, and positive signed volume 5.440912. The render uses subdivision level 2. A separate PowerShell verification launch was denied by Windows, but that did not prevent the queued live check or the already-running final render from completing.

Visual limitation: this is a closer approximation, not an exact match. The reference has broader, smoother reflective patches at the base and along the left edge; the current render retains more fragmented internal reflections.

On resume, `Get-Content` inspected `render-final.log` and `evaluated-mesh-validation.json`, `Get-Item` confirmed the output files, and `view_image` displayed the reference and final PNG. This note was updated with `Set-Content`; no Blender scene state was changed during this final inspection.
