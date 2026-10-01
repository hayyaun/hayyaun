# Prism versions
Current: v001.blend and v001.png.
Use v002, v003, etc. for future revisions. Do not use descriptive design filenames.
Keep the approved dimensions: 4.228592 x 2.642870 x 3.67 unless the user requests a size change.
Edges are defined, vertices rounded. Left corner rounder and higher; right corner and tip tighter.
Previous generated .blend files, Blender backup files and PNG previews were removed at the user's request. Original reference JPG images are untouched. Scripts/logs in prism-matching and prism-refined remain as implementation records; their previous output paths no longer exist. Do not rerun them unmodified; future outputs must use numbered versions here.
Cleanup: Copy-Item preserved the current PNG as v001.png; Blender MCP execute_code saved the active scene as v001.blend and updated the displayed image/render output path. Get-ChildItem selected generated .blend/.blendN/.png files in the two verified output directories; Remove-Item -LiteralPath deleted each listed file. removed-files.txt records exact removed paths.
