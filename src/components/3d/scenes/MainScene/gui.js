const dat = typeof window !== 'undefined' && require('dat.gui');
const gui = dat && new dat.GUI({ closed: false, width: 400 });

if (gui && process.env.NODE_ENV === 'production' && window.datGUI === false)
  gui.hide();

export default gui;
