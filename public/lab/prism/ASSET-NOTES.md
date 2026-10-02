# Current prism assets

v029.glb supplies Reference_Prism geometry to app/lab/prism/scene.tsx. The renderer uses only the outer mesh, with a reflective carbon-metal material. Internal model meshes are not rendered.

The violet, black, and white environment is generated and captured once in the scene, used for reflections only. The visible background is white. No external HDR or smoke texture is required.

The current loading image is public/images/prism-violet-metal.webp. Blender sources and modeling scripts remain in demo/objects/prism; superseded public exports, web previews, generated logs, and Blender backup files have been removed.
