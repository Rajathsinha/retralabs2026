import { useMemo } from 'react';
import * as THREE from 'three';
import { getMotionTier } from '../motionPreferences';

interface MolecularDiagramProps {
  color?: string;
  accentColor?: string;
}

/** Minimal bond-line molecular diagram for scientific content sections. */
export function MolecularDiagram({
  color = '#2563EB',
  accentColor = '#7DD3FC',
}: MolecularDiagramProps) {
  const tier = getMotionTier();

  const nodes = useMemo(
    () => [
      new THREE.Vector3(-1.8, 0.4, 0),
      new THREE.Vector3(-0.6, 0.9, 0),
      new THREE.Vector3(0.5, 0.3, 0),
      new THREE.Vector3(1.4, 0.8, 0),
      new THREE.Vector3(0.2, -0.7, 0),
      new THREE.Vector3(-0.8, -0.5, 0),
    ],
    []
  );

  const bonds = useMemo(() => {
    const pairs = [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 0], [1, 5]];
    const points: THREE.Vector3[] = [];
    pairs.forEach(([a, b]) => {
      points.push(nodes[a].clone(), nodes[b].clone());
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [nodes]);

  const nodeSizes = [0.12, 0.1, 0.14, 0.1, 0.11, 0.09];

  return (
    <group>
      <lineSegments>
        <primitive object={bonds} attach="geometry" />
        <lineBasicMaterial color={accentColor} transparent opacity={0.5} />
      </lineSegments>
      {nodes.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[nodeSizes[i], tier === 'reduced' ? 8 : 12, tier === 'reduced' ? 8 : 12]} />
          <meshPhysicalMaterial
            color={i % 2 === 0 ? color : accentColor}
            metalness={0.1}
            roughness={0.3}
            clearcoat={0.5}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}
