import { useLoader } from '@react-three/fiber';
import React, { useCallback } from 'react';
import { FontLoader } from 'three';
import useRefWithCallback from '../../../hooks/useRefWithCallback';
import { textsFolder } from '../gui/gui';

const TextMesh = ({ text = 'Text', size = 1, ...props }) => {
  const onTextGeometryCreate = useCallback((node) => {
    node.center();
    const textFolder = textsFolder.addFolder(text);
    return () => textsFolder.removeFolder(textFolder);
  }, []);

  // --- refs ---
  const _textGeometry = useRefWithCallback({ onCreate: onTextGeometryCreate });

  // --- loaders ---
  const poppinsFont = useLoader(
    FontLoader,
    '/assets/fonts/Poppins Black_Regular.json',
  );

  // const matcapTexture = useLoader(
  //   TextureLoader,
  //   '/assets/textures/matcaps/7877EE_D87FC5_75D9C7_1C78C0.jpg',
  // );

  return (
    <mesh {...props}>
      <textGeometry
        ref={_textGeometry}
        args={[
          text,
          {
            font: poppinsFont,
            size,
            height: 0.2,
            curveSegments: 50,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.02,
            bevelOffset: 0,
            bevelSegments: 5,
          },
        ]}
      />
      <meshNormalMaterial />
    </mesh>
  );
};

export default TextMesh;
