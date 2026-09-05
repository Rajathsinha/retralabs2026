import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import * as THREE from 'three';
import { PeptideHelix } from '../primitives/PeptideHelix';
import { MolecularField } from '../primitives/MolecularField';
import { getMotionTier } from '../motionPreferences';

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} color="#f0f4ff" />
      <directionalLight position={[-3, 2, -4]} intensity={0.35} color="#7DD3FC" />
      <pointLight position={[0, -2, 3]} intensity={0.4} color="#2563EB" />
      <fog attach="fog" args={['#f8fafc', 8, 18]} />
    </>
  );
}

function HeroCamera() {
  const tier = getMotionTier();

  useFrame(({ camera, clock }) => {
    if (tier === 'static') return;
    const t = clock.elapsedTime * 0.08;
    camera.position.x = Math.sin(t) * 0.25;
    camera.position.y = Math.sin(t * 0.7) * 0.12;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function HeroMolecularScene() {
  const groupRef = useRef<THREE.Group>(null);
  const tier = getMotionTier();

  useFrame(({ clock }) => {
    if (!groupRef.current || tier === 'static') return;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.06) * 0.08;
  });

  return (
    <>
      <SceneLighting />
      <HeroCamera />
      <Environment preset="city" environmentIntensity={0.25} />

      <MolecularField count={tier === 'reduced' ? 32 : 56} color="#2563EB" spread={6} speed={0.03} />

      <group ref={groupRef}>
        <Float speed={0.8} rotationIntensity={0.15} floatIntensity={0.25}>
          <PeptideHelix color="#2563EB" accentColor="#7DD3FC" segments={tier === 'reduced' ? 20 : 32} />
        </Float>
      </group>
    </>
  );
}
