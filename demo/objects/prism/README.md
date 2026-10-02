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

## v004 revised
Current file: v004.blend. Broader rounded crown and side corner transitions, with original approved dimensions preserved. Crown and side slopes are blended continuously. Uniform perimeter sampling avoids collapsed edges near the cap. Lower right shoulder remains higher than the left; underside remains level. Neutral inspection renders: v004-front/right/left/back/top/bottom/angle.png. The first v004 attempt was rejected and replaced in this version; v003 remains available unchanged.
Commands: Set-Content updated v004.py and v004-preview.py. Blender MCP execute_blender_code ran v004.py to replace and save the geometry, and launched a background Blender process with v004-preview.py to inspect the shape. get_viewport_screenshot and get_scene_info checked the live scene. Validation: zero non-manifold edges, zero degenerate faces, positive volume. No paid generation or glass render was run.

## v005
Narrowed the rounded transitions between front/back and side faces while retaining the v004 rounded crown and base corners. Dimensions unchanged: 4.228592 x 2.642870 x 3.67. Inspected neutral front, side, top and angled previews. Mesh has no non-manifold edges or degenerate faces. v005 is a correction to the overly softened edges of v004, not an assertion of an exact reference match.
Commands: Set-Content wrote v005.py and v005-preview.py; Blender MCP execute_blender_code ran the generator, saved v005.blend and launched the preview script in a background Blender process. get_viewport_screenshot/get_scene_info verified the live scene. Earlier numbered versions are preserved.

## v006
Current: v006.blend and v006.glb. Only the upper geometry was revised: four planar face regions meet narrow rounded corner transitions and a tangent rounded crown. Approved dimensions are unchanged. The lower 20 mesh rings match v005 exactly (maximum vertex displacement 0). Earlier numbered versions remain available.
Export: selected prism only, no Blender materials or studio objects; public/lab/prism/v006.glb (922,528 bytes). The website supplies its glass/solid materials. Three.js GLTFLoader successfully reads Reference_Prism with 25,601 vertices and 51,198 triangles.
Validation: zero non-manifold edges, positive volume, neutral multiview inspection. npm run lint and npm run build passed. Local production preview verified in glass and solid modes; public deployment remains unverified pending hosting information.
Commands/actions: Set-Content wrote v006.py and v006-preview.py. Blender MCP execute_blender_code replaced the active prism mesh, saved v006.blend, rendered inspection previews and ran bpy.ops.export_scene.gltf. Copy-Item copied the GLB to this directory. node demo/objects/prism/v006-check.mjs checked Three.js loading. npm run lint && npm run build passed. npm run start -- --hostname 0.0.0.0 started the local preview. scene.tsx now loads v006.glb and its Reference_Prism mesh.

## v007
Replaces the v006 shoulder with a monotone tangent transition into four planar upper faces. Rounded lower base retained with a maximum normalization displacement of 0.000204 Blender units. Ice material: pale blue, roughness 0.19, IOR 1.31, transmission 0.94. Export includes the material. Zero non-manifold edges; dimensions unchanged.

## v008
Rebuilt as four planar pyramid faces with weighted rounded edge intersections. Removes the stepped shoulder introduced by the ring-based v006/v007 construction. Dimensions remain 4.228592 x 2.642870 x 3.67. Clear ice: IOR 1.31, transmission 1, roughness 0.025, near-neutral color. Planar face vertex normals preserve flat shading; fillet interiors retain smooth normals. 1,157 vertices and 2,310 triangles; zero non-manifold edges.
Blender MCP executed v008.py, saved v008.blend and exported v008.glb. Set-Content wrote scripts and updated scene.tsx. Copy-Item copied the GLB. node demo/objects/prism/v008-check.mjs validated loading; npm run lint and npm run build passed. npm run start -- --hostname 0.0.0.0 restarted the local preview. Solid and ice modes checked in browser. Earlier versions retained. This is a reconstruction, not an exact reference match.

## v009
Restores the saved v005 mesh and transforms. Only upper face interiors are adjusted toward fitted planes, limited to 0.008 Blender units (observed maximum 0.007354) with smooth falloff. Bottom vertices below the edit region, rounded edge vertices, and crown are locked. Base displacement is exactly 0; zero non-manifold edges. Clear ice retained. Blender MCP loaded v005 mesh, executed v009.py, saved v009.blend and exported v009.glb. Copy-Item installed the web asset; Set-Content updated scene.tsx.


## v010
Four continuous affine upper face planes replace the old middle-height crown blend. Their outlines have rounded lower corners and narrow toward an oval cap; the global apex is joined tangentially. The lower asymmetry continues as an affine shear in the planar region, avoiding a mid-face bend. Original v005 lower vertices through normalized height 0.23 are copied exactly: displacement 0.0. Four face interior plane fits have maximum errors below 0.000000184 Blender units. Zero non-manifold edges. Clear ice retained; dimensions unchanged.
Commands: python3 demo/objects/prism/v010-update.py generated the initial script; Set-Content refined v010.py and scene.tsx; Blender MCP executed v010.py, saved v010.blend and exported v010.glb. Copy-Item installed the GLB in public/lab/prism. node demo/objects/prism/v010-check.mjs, npm run lint and npm run build passed. Neutral front/side/angle inspection renders verified. npm run start -- --hostname 0.0.0.0 restarted the local preview.

## v011
Local refinement of v010: a wider tangent cap rounds the tip (total height reduced by about 1.5%, without scaling the body). A five-ring filter smooths only the left rounded transition above the locked base; maximum local adjustment about 0.001572 units. All vertices outside the tip and that left transition are copied exactly from v010, with measured displacement 0.0. Bottom unchanged. Flat face interiors and clear ice retained.
Commands/actions: python3 demo/objects/prism/v011-update.py generated the initial script; Set-Content refined v011.py and scene.tsx. Blender MCP executed v011.py, saved v011.blend, and exported v011.glb. Copy-Item installed the web asset. node demo/objects/prism/v011-check.mjs verified loading. npm run lint and npm run build verified the site.

## v012
Crown-only revision of v011. Uses a cubic profile with a tangent and curvature-continuous start at the planar slopes, rounding into a horizontal apex. Cross sections become elliptical gradually within the crown to remove the pinched transition. Every vertex below normalized ring height 0.84 is copied exactly from v011 (zero displacement). Bottom, left-edge correction, and main face interiors preserved. Actual height 3.541896 (about 2% shorter than v011); width and depth unchanged. Clear ice retained.
Commands/actions: python3 demo/objects/prism/v012-update.py and v012-cap.py prepared the generator; Set-Content applied the current-file loading fix and updated scene.tsx. Blender MCP executed v012.py, saved v012.blend and exported v012.glb. Copy-Item installed the public GLB. node demo/objects/prism/v012-check.mjs checked Three.js loading. npm run lint and npm run build checked the site.

### v012 crown correction
Replaced the separate cap with one quintic surface loft, maintaining tangent direction at the join and a rounded apex. v011 vertices through ring 92 (normalized height 0.819375) are copied exactly; locked displacement 0.0. No non-manifold edges. Height 3.54. This supersedes the earlier cubic-cap description.

## v013
Local left rounded-transition smoothing with feathered spatial weights. Geometry outside that strip is copied exactly from v012; displacement 0.0. Approved crown, face interiors, and underside preserved. Maximum local change 0.018388 units. Zero non-manifold edges. Blender MCP executed v013.py, saved and exported v013. Set-Content updated the script and scene.tsx; Copy-Item installed the GLB.

## v014
Smoothing extends down into the lower front-left fillet only (negative X, negative Y). v013 is the source. All vertices outside the feathered lower front-left patch remain identical (0.0 displacement); crown and flat interiors retained. Maximum local movement 0.05814 units; no non-manifold edges. Blender MCP executed v014.py, saved v014.blend and exported v014.glb. Set-Content updated the script and scene.tsx; Copy-Item installed the web asset.

## v016 recovery
Exact v014 mesh and transforms restored after v015 lower-corner smoothing was rejected. Verified maximum vertex difference from v014: 0.0. No additional smoothing or reshaping. Blender MCP restored, saved and exported v016; Copy-Item installed the GLB; Set-Content updated scene.tsx.

## v017
Lower-left surface treated as one continuous region across both front-left and back-left transitions. Source v016. Crown, front face center, right side and underside locked; outside-region displacement 0.0. Maximum local displacement 0.040787 units. Zero non-manifold edges. Inspected left, front-left and back-left renders. Blender MCP executed v017.py and exported GLB; Copy-Item installed it; Set-Content updated scene.tsx. node demo/objects/prism/v017-check.mjs, npm run lint and npm run build passed.

## v018
User-requested left base narrowing: inward X shift up to 0.18 units, smoothly faded toward the center and upper face. Right side and crown unchanged; rounded corner retained. No non-manifold edges. Blender MCP executed v018.py, saved and exported. Copy-Item installed GLB; Set-Content updated scene.tsx.

## v019
User-requested slight overall narrowing. v018 mesh scaled by 0.95 along X about its bounding-box center only. Height, depth, topology and material preserved. Blender MCP saved v019.blend and exported v019.glb; Copy-Item installed public asset; Set-Content updated scene.tsx.

## v020
Light surface relaxation (maximum 0.006782 units) with crown locked. Added five internal reversed-normal ellipsoidal air cavities near bottom-right; combined into v020-air. Both prism and cavities exported. Web renderer normalizes both meshes together and hides bubbles in solid inspection mode. Set-Content wrote scripts and scene.tsx; Blender MCP saved/exported; Copy-Item installed GLB.

## v021
Light feathered smoothing on the lower surface to reduce unevenness while retaining the rounded right corner. Upper mesh locked. Air pockets retained. Blender MCP saved/exported v021; Copy-Item installed GLB; Set-Content updated scene.tsx.

## v022
Replaced the five v020 air pockets with one larger ellipsoidal inclusion at the bottom-right. Inclusion shares the outer prism's Blender material; web optical parameters match the prism. Outer v021 mesh unchanged. Blender MCP removed the generated bubble cluster, saved/exported v022. Copy-Item installed the GLB; Set-Content updated scene.tsx.

## v023
Added inset copy of approved prism filling upper region. Flat closed floor at local Z 0.94 above the rounded base. Shared material; existing bottom-right inclusion retained. Outer mesh untouched. Inner mesh is closed with zero non-manifold edges. Blender MCP executed v023.py and exported three selected meshes; Copy-Item installed GLB; python3 demo/objects/prism/v023-web.py updated renderer for the inner prism.

## v025
Upper inner prism removed. Bottom-right inclusion enlarged into a broad tapered pocket, then expanded toward outer faces with ray-limited clearance of 0.035 units. Outer mesh unchanged. Blender MCP saved/exported; Copy-Item installed GLB; Set-Content updated scene.tsx.


v026: Added a thin glass section at height 0.66 fitted inside the outer outline. Preserves v025 bubble and outer body; upper inner prism remains removed.
v027: Glass section follows the exact outer contour with rounded edges and a small slope (z = 0.66 + 0.045x + 0.06y). Upper inner prism removed; outer body and v025 inclusion preserved.
