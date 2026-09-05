import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { MolecularField } from '../primitives/MolecularField';
import { PeptideHelix } from '../primitives/PeptideHelix';
import { getMotionTier } from '../motionPreferences';

interface CTAConvergenceSceneProps {
  converge?: number;
}

export default function CTAConvergenceScene({ converge = 0.6 }: CTAConvergenceSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const tier = getMotionTier();

  useFrame(({ clock }) => {
    if (!groupRef.current || tier === 'static') return;
    groupRef.current.rotation.y = clock.elapsedTime * 0.04;
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[0, 3, 5]} intensity={0.5} color="#7DD3FC" />
      <pointLight position={[0, 0, 2]} intensity={0.3} color="#2563EB" />
      <fog attach="fog" args={['#111111', 3, 10]} />

      <group ref={groupRef}>
        <MolecularField
          count={tier === 'reduced' ? 24 : 40}
          color="#38bdf8"
          spread={4.5}
          speed={0.02}
          converge={converge}
        />
        <PeptideHelix
          color="#2563EB"
          accentColor="#7DD3FC"
          segments={tier === 'reduced' ? 14 : 20}
          height={2.8}
          radius={0.8}
          speed={0.06}
        />
      </group>
    </>
  );
}
