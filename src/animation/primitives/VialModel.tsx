import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getMotionTier } from '../motionPreferences';

interface VialModelProps {
  accentColor?: string;
  materialize?: number;
  speed?: number;
}

export function VialModel({
  accentColor = '#2563EB',
  materialize = 1,
  speed = 0.18,
}: VialModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const tier = getMotionTier();

  useFrame((_, delta) => {
    if (!groupRef.current || tier === 'static') return;
    groupRef.current.rotation.y += delta * speed;
  });

  const opacity = THREE.MathUtils.clamp(materialize, 0, 1);
  const scale = 0.85 + opacity * 0.15;

  return (
    <group ref={groupRef} scale={scale}>
      {/* Glass body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.62, 2.4, tier === 'reduced' ? 24 : 32, 1, true]} />
        <meshPhysicalMaterial
          color="#ffffff"
          metalness={0}
          roughness={0.05}
          transmission={0.92}
          thickness={0.4}
          transparent
          opacity={opacity * 0.85}
          clearcoat={1}
          clearcoatRoughness={0.1}
          ior={1.45}
        />
      </mesh>

      {/* Lyophilised powder / liquid */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 0.7, 24]} />
        <meshPhysicalMaterial
          color={accentColor}
          metalness={0.1}
          roughness={0.35}
          transparent
          opacity={opacity * 0.7}
          emissive={accentColor}
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Rubber stopper */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.25, 24]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.8} transparent opacity={opacity} />
      </mesh>

      {/* Aluminium crimp cap */}
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.52, 0.52, 0.18, 24]} />
        <meshStandardMaterial color="#c0c4cc" metalness={0.85} roughness={0.25} transparent opacity={opacity} />
      </mesh>

      {/* Label band */}
      <mesh position={[0, 0.15, 0.58]}>
        <boxGeometry args={[0.9, 1.1, 0.02]} />
        <meshStandardMaterial color="#f8fafc" metalness={0} roughness={0.9} transparent opacity={opacity * 0.9} />
      </mesh>
    </group>
  );
}
