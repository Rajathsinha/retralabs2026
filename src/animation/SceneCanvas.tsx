import { Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { getDpr, getMotionTier, shouldLoad3D } from './motionPreferences';
import { useSceneVisibility } from './useSceneVisibility';
import { canUseWebGL } from './webgl';
import { SceneErrorBoundary } from './SceneErrorBoundary';

interface SceneCanvasProps {
  children: ReactNode;
  fallback: ReactNode;
  className?: string;
  camera?: { position: [number, number, number]; fov: number };
  style?: React.CSSProperties;
}

export function SceneCanvas({
  children,
  fallback,
  className = '',
  camera = { position: [0, 0, 6], fov: 42 },
  style,
}: SceneCanvasProps) {
  const { ref, isVisible } = useSceneVisibility<HTMLDivElement>();
  const tier = getMotionTier();
  const webglAvailable = canUseWebGL();

  if (!shouldLoad3D() || !webglAvailable) {
    return (
      <div className={className} style={style} aria-hidden="true">
        {fallback}
      </div>
    );
  }

  return (
    <div ref={ref} className={className} style={style}>
      {!isVisible ? (
        fallback
      ) : (
        <SceneErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <Canvas
              dpr={getDpr(tier)}
              camera={camera}
              gl={{ antialias: tier === 'full', alpha: true, powerPreference: 'high-performance' }}
              style={{ width: '100%', height: '100%' }}
            >
              {children}
            </Canvas>
          </Suspense>
        </SceneErrorBoundary>
      )}
    </div>
  );
}
