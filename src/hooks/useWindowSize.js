import { useEffect, useState } from 'react';

export default function useWindowSize() {
  const isSSR = typeof window === 'undefined';
  function getSize() {
    return {
      width: !isSSR ? window.innerWidth : undefined,
      height: !isSSR ? window.innerHeight : undefined,
    };
  }

  const [windowSize, setWindowSize] = useState(getSize);

  useEffect(() => {
    const isSSR = typeof window === 'undefined';
    function getSize() {
      return {
        width: !isSSR ? window.innerWidth : undefined,
        height: !isSSR ? window.innerHeight : undefined,
      };
    }

    if (isSSR) {
      return false;
    }

    function handleResize() {
      setWindowSize(getSize());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures that effect is only run on mount and unmount

  return windowSize;
}
