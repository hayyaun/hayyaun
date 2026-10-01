# Smoke texture

`smoke.webp` is a 1024 × 1024, 42 KB asset generated with the built-in imagegen tool and optimized with Sharp. It is a smoke-only texture; the prism uses the supplied GLB geometry and refraction is rendered live. UV flow gently animates the smoke image; this is not a volumetric fluid simulation.

## Prism model
`v006.glb` is exported from `demo/objects/prism/v006.blend`. Its four upper faces are planar between rounded corner transitions and the rounded crown. The approved lower rounded geometry and dimensions are preserved. Only the prism mesh is exported (922,528 bytes); studio objects and Blender materials are excluded. Three.js loads the mesh as `Reference_Prism` and supplies the live glass or solid inspection material.

Generation prompt:
Create a production texture asset, NOT a website mockup. One diffuse lavender smoke plume on perfectly pure white (#ffffff), square 1024 or 1536 composition. Photorealistic high-speed studio photograph of very fine suspended lavender ink-like vapor in air. Elegant soft curls, translucent tendrils, layered turbulent wisps, with delicate internal shading, no coarse noise or outlines. Main plume rises diagonally from bottom right toward upper left, leaving substantial empty pure white outer margin of 15% on all four sides and a quieter translucent central opening where a glass prism could be placed later. Medium pale lavender in central thicker wisps, lighter pearl on outer wisps. Some thin streaks, some cloudy soft depth, no dense opaque mass. Smoke occupies about 70% of frame, centrally balanced. Soft diffuse lighting. Outer smoke fades completely into pure white seamlessly on every edge. NO glass, NO prism, no objects, no fabric, no ribbon, no text, no floor, no borders, no gray backdrop, no black. This is a background smoke texture that will be refracted through a separately rendered real 3D glass object. Natural volumetric smoke, realistic, beautiful, quiet. Overall light neutral atmosphere.

## Studio environment
`studio.hdr` is the studio_small_03_1k.hdr environment distributed in pmndrs/drei-assets (revision 456060a26bbeb8fdf79326f224b6d99b8bcce736), originally from Poly Haven. It is self-hosted and used for reflections, not the visible white background.
Source: https://github.com/pmndrs/drei-assets/blob/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/studio_small_03_1k.hdr


## Current version: v007
v007.glb supersedes v006. Smooth tangent shoulder and pale blue ice material; the web renderer uses matching roughness, IOR and transmission settings.

## Current version: v008
v008.glb replaces the stepped ring construction with four planar faces and rounded boundary fillets. Clear ice material: IOR 1.31, roughness 0.025, transmission 1. Only the prism is exported.

## Current version: v009
Restores v005 geometry with bounded upper face interior adjustments. Original rounded bottom and edges retained. Clear ice material; v008 is superseded.

## Current version: v010
Four continuous planar face interiors with rounded outlines replace the middle-height crown blend. Original lower geometry retained exactly through normalized height 0.23; clear ice material unchanged.
