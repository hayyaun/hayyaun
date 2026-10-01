# Curved glass prism revision

Final scene: prism-best-match.blend
Beauty render: prism-best-match.png
Neutral geometry view: prism-shape-check.png
Mesh checks: validation.json

The model follows the user's clarification: a softly rounded rectangular base with width/depth 2:1, taper toward the crown, larger front and smaller back face. The last revision tightens the lower corners and apex and reduces the exaggerated outline bow. The base remains continuously curved. It is a closed solid, not a hollow triangular frame.

The glass material includes an art-directed reflective outer perimeter. It is intended to approximate the reference appearance, not to represent a uniform physically pure glass formulation. The interior remains transmissive. Exact reference highlights have not been reproduced.

Final dimensions: 4.22859 x 2.11430 x 3.66818 Blender units. Width/depth ratio: 2.0. Base mesh: 18,482 vertices, 18,720 faces. Evaluated subdivision: 74,402 vertices, 74,400 faces. Both have zero non-manifold and boundary edges, with positive signed volume.

## Commands and state changes

Commands were run from the project directory in PowerShell. The Blender MCP add-on was reached through the existing local TCP bridge on port 9876.

Final commands:

```powershell
& 'mc-helper\prism-matching\render-final.ps1'
& 'mc-helper\prism-matching\load-final.ps1'
Get-Content -LiteralPath 'mc-helper\prism-matching\finalize-curved.log' -Tail 5
Get-Content -LiteralPath 'mc-helper\prism-matching\validation.json'
```

The two PowerShell scripts preserve the complete actual launch/load commands. render-final.ps1 uses Invoke-PrismBlender 'execute_code' to launch Blender with lean-curved.blend and finalize-curved.py. load-final.ps1 opens prism-best-match.blend in the live Blender window. Loading the file changes the active scene. The saved file uses CPU rendering for portability; CUDA was used only in separate render workers, without saving application preferences.

Read-only inspection used Get-Content for logs/scripts, Get-ChildItem to check outputs, Blender get_scene_info / get_viewport_screenshot, and view_image to visually compare renders and reference images. describe_node_type inspected the Geometry shader's Backfacing socket.

Candidate script files were written with Set-Content -LiteralPath ... -Encoding UTF8 and launched through the same MCP bridge. Candidate order during this resumed work: flow-sweep.py, bevel-sweep.py, pyramid-sweep.py, crystal-sweep.py, finish-sweep.py, curved-pillow.py, curved-studio.py, lean-curved.py, finalize-curved.py. They changed geometry, shader nodes, lights, world/background nodes and camera settings in separate candidate files. inspect-normals.py checked normal orientation. finalize-pyramid.py was superseded by the curved-base correction.

```powershell
Stop-Process -Id 20780
```

This stopped only the specific superseded background render worker we had launched, after the user requested the rounder base. The interactive Blender process was not stopped.

The older live scene is preserved as baseline.blend in this directory and prism-refined/prism-studio.blend. Intermediate candidates are retained for comparison. No portfolio website source or project dependencies were changed.
