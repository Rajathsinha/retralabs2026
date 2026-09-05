import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VialModel } from '../primitives/VialModel';
import { getMotionTier } from '../motionPreferences';

interface ProductMorphSceneProps {
  accentColor: string;
  prevAccentColor: string;
  morphProgress: number;
}

/** Smooth 3D crossfade between product vials. */
export default function ProductMorphScene({
  accentColor,
  prevAccentColor,
  morphProgress,
}: ProductMorphSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const tier = getMotionTier();
  const smoothProgress = useRef(0);

  useEffect(() => {
    smoothProgress.current = morphProgress;
  }, [morphProgress]);

  useFrame((_, delta) => {
    if (!groupRef.current || tier === 'static') return;
    smoothProgress.current = THREE.MathUtils.damp(smoothProgress.current, morphProgress, 6, delta);
    groupRef.current.rotation.y += delta * 0.12;
  });

  const p = smoothProgress.current;
  const outOpacity = 1 - p;
  const inOpacity = p;

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 5, 3]} intensity={0.95} />
      <directionalLight position={[-3, 1, -2]} intensity={0.25} color="#7DD3FC" />
      <fog attach="fog" args={['#ffffff', 5, 12]} />

      <group ref={groupRef}>
        <group visible={outOpacity > 0.02} scale={0.9 + outOpacity * 0.1}>
          <VialModel accentColor={prevAccentColor} materialize={outOpacity} speed={0} />
        </group>
        <group visible={inOpacity > 0.02} scale={0.9 + inOpacity * 0.1}>
          <VialModel accentColor={accentColor} materialize={inOpacity} speed={0} />
        </group>
      </group>
    </>
  );
}
