import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { VialModel } from '../primitives/VialModel';
import { MolecularField } from '../primitives/MolecularField';
import { getMotionTier } from '../motionPreferences';

interface ProductVialSceneProps {
  accentColor?: string;
  materialize?: number;
}

export default function ProductVialScene({
  accentColor = '#2563EB',
  materialize = 1,
}: ProductVialSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetMaterialize = useRef(materialize);
  const currentMaterialize = useRef(0);
  const tier = getMotionTier();

  useEffect(() => {
    targetMaterialize.current = materialize;
  }, [materialize]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    currentMaterialize.current = THREE.MathUtils.damp(
      currentMaterialize.current,
      targetMaterialize.current,
      4,
      delta
    );
    if (tier !== 'static') {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 4]} intensity={1} color="#ffffff" />
      <directionalLight position={[-2, 2, -3]} intensity={0.3} color={accentColor} />
      <Environment preset="studio" environmentIntensity={0.3} />
      <fog attach="fog" args={['#f8fafc', 6, 14]} />

      <MolecularField
        count={tier === 'reduced' ? 20 : 32}
        color={accentColor}
        spread={4}
        speed={0.025}
        converge={currentMaterialize.current * 0.3}
      />

      <group ref={groupRef}>
        <VialModel
          accentColor={accentColor}
          materialize={currentMaterialize.current}
          speed={0.1}
        />
      </group>
    </>
  );
}
