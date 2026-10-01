# Prism versions
Current: v001.blend and v001.png.
Use v002, v003, etc. for future revisions. Do not use descriptive design filenames.
Keep the approved dimensions: 4.228592 x 2.642870 x 3.67 unless the user requests a size change.
Edges are defined, vertices rounded. Left corner rounder and higher; right corner and tip tighter.
Previous generated .blend files, Blender backup files and PNG previews were removed at the user's request. Original reference JPG images are untouched. Scripts/logs in prism-matching and prism-refined remain as implementation records; their previous output paths no longer exist. Do not rerun them unmodified; future outputs must use numbered versions here.
Cleanup: Copy-Item preserved the current PNG as v001.png; Blender MCP execute_code saved the active scene as v001.blend and updated the displayed image/render output path. Get-ChildItem selected generated .blend/.blendN/.png files in the two verified output directories; Remove-Item -LiteralPath deleted each listed file. removed-files.txt records exact removed paths.

## v003
Rebuilt from prism-faces.png and prism-faces-simplified.png. Front/back are opposing triangular sloped regions, surrounded by rounded outer transitions. The horizontal sections follow a rounded rectangle; the shoulder rises on the right while the underside remains level. Dashed lines were treated as hidden boundaries, not grooves. Overall dimensions are preserved: 4.228592 x 2.642870 x 3.67.

v003.py contains the full generator. v003-preview.py produces untextured front/back/left/right/top/bottom/angled inspection renders. These are interpreted reconstructions of illustrative views, not a dimensionally exact tracing. Mesh validation reports zero non-manifold edges and positive volume. No paid asset generators were used.

Commands: Set-Content wrote v003.py and v003-preview.py. Blender MCP execute_blender_code executed the generator, replaced the current object's mesh, and saved v003.blend. A background Blender process ran v003-preview.py. get_viewport_screenshot and get_scene_info verified the live result. Prior versions and original reference images are preserved.
