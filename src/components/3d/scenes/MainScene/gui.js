const dat = typeof window !== 'undefined' && require('dat.gui');
const gui = dat && new dat.GUI({ closed: false, width: 400 });

if (gui && process.env.NODE_ENV === 'production') gui.hide();

// scene
export const lightsFolder = gui && gui.addFolder('lights');
export const objectsFolder = gui && gui.addFolder('objects');
// objects
export const cubesFolder = gui && objectsFolder.addFolder('cubes');

export default gui;
