import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getMotionTier } from '../motionPreferences';

interface PeptideHelixProps {
  color?: string;
  accentColor?: string;
  segments?: number;
  radius?: number;
  height?: number;
  speed?: number;
}

export function PeptideHelix({
  color = '#2563EB',
  accentColor = '#7DD3FC',
  segments = 28,
  radius = 1.2,
  height = 4.5,
  speed = 0.12,
}: PeptideHelixProps) {
  const groupRef = useRef<THREE.Group>(null);
  const tier = getMotionTier();
  const count = tier === 'reduced' ? Math.floor(segments * 0.55) : segments;

  const nodes = useMemo(() => {
    const items: { position: THREE.Vector3; scale: number; isBackbone: boolean }[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 5.5;
      const y = (t - 0.5) * height;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      items.push({
        position: new THREE.Vector3(x, y, z),
        scale: i % 4 === 0 ? 0.14 : 0.09,
        isBackbone: i % 4 === 0,
      });
    }
    return items;
  }, [count, height, radius]);

  const bonds = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      points.push(nodes[i].position.clone(), nodes[i + 1].position.clone());
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [nodes]);

  useFrame((_, delta) => {
    if (!groupRef.current || tier === 'static') return;
    groupRef.current.rotation.y += delta * speed;
  });

  return (
    <group ref={groupRef}>
      <lineSegments>
        <primitive object={bonds} attach="geometry" />
        <lineBasicMaterial color={accentColor} transparent opacity={0.35} />
      </lineSegments>
      {nodes.map((node, i) => (
        <mesh key={i} position={node.position} scale={node.scale}>
          <sphereGeometry args={[1, tier === 'reduced' ? 8 : 12, tier === 'reduced' ? 8 : 12]} />
          <meshPhysicalMaterial
            color={node.isBackbone ? color : accentColor}
            metalness={0.15}
            roughness={0.25}
            clearcoat={0.6}
            transparent
            opacity={node.isBackbone ? 0.95 : 0.75}
          />
        </mesh>
      ))}
    </group>
  );
}
