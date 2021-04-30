import folderTypes from './folderTypes';

const dat = typeof window !== 'undefined' && require('dat.gui');
const gui = dat && new dat.GUI({ closed: false, width: 400 });

if (gui && process.env.NODE_ENV === 'production') gui.hide();

export const lightsFolder = gui && gui.addFolder(folderTypes.lights);
export const objectsFolder = gui && gui.addFolder(folderTypes.objects);
export const textsFolder = gui && objectsFolder.addFolder(folderTypes.texts);

export default gui;
