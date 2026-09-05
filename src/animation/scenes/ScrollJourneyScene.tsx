import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PeptideHelix } from '../primitives/PeptideHelix';
import { MolecularField } from '../primitives/MolecularField';
import { VialModel } from '../primitives/VialModel';
import { getMotionTier } from '../motionPreferences';

interface ScrollJourneySceneProps {
  progress: number;
}

export default function ScrollJourneyScene({ progress }: ScrollJourneySceneProps) {
  const cameraGroupRef = useRef<THREE.Group>(null);
  const tier = getMotionTier();

  useFrame(() => {
    if (!cameraGroupRef.current || tier === 'static') return;
    const p = progress;
    cameraGroupRef.current.position.z = 7 - p * 3;
    cameraGroupRef.current.position.y = p * 0.8 - 0.4;
    cameraGroupRef.current.rotation.y = p * 0.6 - 0.3;
  });

  const helixOpacity = 1 - Math.min(1, progress * 1.8);
  const vialMaterialize = THREE.MathUtils.smoothstep(progress, 0.35, 0.75);

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[3, 5, 4]} intensity={0.9} color="#e0f2fe" />
      <directionalLight position={[-4, 1, -2]} intensity={0.3} color="#38bdf8" />
      <pointLight position={[0, 0, 2]} intensity={0.5} color="#0ea5e9" />
      <fog attach="fog" args={['#07111f', 4, 14]} />

      <group ref={cameraGroupRef}>
        <MolecularField count={tier === 'reduced' ? 28 : 44} color="#7DD3FC" spread={5} speed={0.02} />

        <group visible={helixOpacity > 0.05} scale={helixOpacity}>
          <PeptideHelix
            color="#38bdf8"
            accentColor="#7DD3FC"
            segments={tier === 'reduced' ? 16 : 24}
            height={3.5}
            speed={0.08}
          />
        </group>

        <group position={[0, -0.3, 0]} visible={vialMaterialize > 0.05}>
          <VialModel accentColor="#38bdf8" materialize={vialMaterialize} speed={0.12} />
        </group>
      </group>
    </>
  );
}
