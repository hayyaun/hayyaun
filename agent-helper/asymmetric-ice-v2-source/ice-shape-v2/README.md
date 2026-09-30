# Asymmetric ice v2

Use `asymmetric-ice-v2.glb` in place of the first rounded-ice GLB. The front silhouette is fitted directly to the top-left FRONT panel of your latest six-view reference (`image(3).png`). The generated single-object study was not used to generate the mesh.

The revised model is broader, deeper and more asymmetric: its upper tip sits to the right, its left flank sweeps outward, and the thick bottom curves under the body. It is a single closed surface with 15,266 vertices and 30,528 triangles. Front is +Z, up is +Y, minimum Y is zero. Height is normalized to 1; width is about 1.060 and depth about 0.801.

The GLB includes a clear ice material using transmission, volume and IOR extensions. It has no embedded lights or environment. Use the project's existing lighting/reflection environment to judge the ice appearance. The PNG preview deliberately uses a neutral opaque inspection material and colored guide lines so the geometry stays readable; those colors are not baked into the GLB.

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const gltf = await new GLTFLoader().loadAsync('/models/asymmetric-ice-v2.glb');
scene.add(gltf.scene);
// To inspect the front, place the camera on +Z and look at (0, 0.5, 0).
```

`fitted-profiles.json` contains the horizontal slice centers and widths. The front envelope is traced from the colored reference lines; thickness is estimated by averaging the left and right panels. Smooth rounded triangular cross-sections connect those slices. These are coherent modeling choices, not measurements of a physical object. The stylized reference's six panels are not perfectly consistent, so the front is prioritized.

`rebuild.py` regenerates the GLB, profile data, validation report and preview from `reference.png`. It requires Python with numpy, scipy, pillow and matplotlib. Cross-section shape is controlled in `section()`, and vertical/circumference resolution by `VERTICAL`, `ARC` and `EDGE`.

Checks performed: all edges have two incident faces, positive enclosed volume, nonzero triangles, finite unit normals, GLB header/accessor byte validation, and equality of exported arrays with the preview mesh. The source profile's mean contour deviation is approximately half a pixel. This measures front-outline fit only, not complete 3D accuracy. Browser rendering was not tested.

Three.js documentation for the loader and supported material extensions:
https://threejs.org/docs/pages/GLTFLoader.html
