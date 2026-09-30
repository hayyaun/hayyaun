# Smoke texture

`smoke.webp` is a 1024 × 1024, 42 KB asset generated with the built-in imagegen tool and optimized with Sharp. It is a smoke-only texture; the prism uses the supplied GLB geometry and refraction is rendered live. UV flow gently animates the smoke image; this is not a volumetric fluid simulation.

## Ice model
`asymmetric-ice-v5.glb` is copied unchanged from the user-supplied `agent-helper/` asset. The renderer preserves its surface and normals, centering and uniformly scaling it for framing. The GLB mesh is named `AsymmetricRectangularPyramidV5`; its supplied ice material parameters inform the live transmission material.

Generation prompt:
Create a production texture asset, NOT a website mockup. One diffuse lavender smoke plume on perfectly pure white (#ffffff), square 1024 or 1536 composition. Photorealistic high-speed studio photograph of very fine suspended lavender ink-like vapor in air. Elegant soft curls, translucent tendrils, layered turbulent wisps, with delicate internal shading, no coarse noise or outlines. Main plume rises diagonally from bottom right toward upper left, leaving substantial empty pure white outer margin of 15% on all four sides and a quieter translucent central opening where a glass prism could be placed later. Medium pale lavender in central thicker wisps, lighter pearl on outer wisps. Some thin streaks, some cloudy soft depth, no dense opaque mass. Smoke occupies about 70% of frame, centrally balanced. Soft diffuse lighting. Outer smoke fades completely into pure white seamlessly on every edge. NO glass, NO prism, no objects, no fabric, no ribbon, no text, no floor, no borders, no gray backdrop, no black. This is a background smoke texture that will be refracted through a separately rendered real 3D glass object. Natural volumetric smoke, realistic, beautiful, quiet. Overall light neutral atmosphere.

## Studio environment
`studio.hdr` is the studio_small_03_1k.hdr environment distributed in pmndrs/drei-assets (revision 456060a26bbeb8fdf79326f224b6d99b8bcce736), originally from Poly Haven. It is self-hosted and used for reflections, not the visible white background.
Source: https://github.com/pmndrs/drei-assets/blob/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/studio_small_03_1k.hdr
