const dat = typeof window !== 'undefined' && require('dat.gui');
const gui = dat && new dat.GUI({ closed: false, width: 400 });

export default gui;
