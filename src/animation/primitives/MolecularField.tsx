import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getMotionTier, getParticleCount } from '../motionPreferences';

interface MolecularFieldProps {
  count?: number;
  color?: string;
  spread?: number;
  speed?: number;
  converge?: number;
}

export function MolecularField({
  count = 48,
  color = '#2563EB',
  spread = 5,
  speed = 0.04,
  converge = 0,
}: MolecularFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const tier = getMotionTier();
  const particleCount = getParticleCount(tier, count, Math.floor(count * 0.45));

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = spread * (0.4 + Math.random() * 0.6);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      vel.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.008
        )
      );
    }
    return { positions: pos, velocities: vel };
  }, [particleCount, spread]);

  useFrame((_, delta) => {
    if (!pointsRef.current || tier === 'static') return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      const targetScale = 1 - converge * 0.75;
      posAttr.array[ix] = (posAttr.array[ix] + velocities[i].x * delta * 60) * (1 - converge * 0.02) * targetScale;
      posAttr.array[ix + 1] = (posAttr.array[ix + 1] + velocities[i].y * delta * 60) * (1 - converge * 0.02) * targetScale;
      posAttr.array[ix + 2] = (posAttr.array[ix + 2] + velocities[i].z * delta * 60) * (1 - converge * 0.02) * targetScale;

      // Gentle orbital drift
      const angle = delta * speed;
      const x = posAttr.array[ix];
      const z = posAttr.array[ix + 2];
      posAttr.array[ix] = x * Math.cos(angle) - z * Math.sin(angle);
      posAttr.array[ix + 2] = x * Math.sin(angle) + z * Math.cos(angle);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={tier === 'reduced' ? 0.04 : 0.055}
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
