import { lazy } from 'react';
import { SceneCanvas } from './SceneCanvas';

const HeroScene = lazy(() => import('./scenes/HeroMolecularScene'));
const ScrollScene = lazy(() => import('./scenes/ScrollJourneyScene'));
const VialScene = lazy(() => import('./scenes/ProductVialScene'));
const MorphScene = lazy(() => import('./scenes/ProductMorphScene'));
const CTAScene = lazy(() => import('./scenes/CTAConvergenceScene'));
const DiagramScene = lazy(() => import('./scenes/ScientificDiagramScene'));

interface HeroSceneWrapperProps {
  className?: string;
  fallbackSrc?: string;
}

export function HeroSceneWrapper({
  className = '',
  fallbackSrc = '/peptide.png',
}: HeroSceneWrapperProps) {
  return (
    <SceneCanvas
      className={className}
      camera={{ position: [0, 0.2, 7], fov: 38 }}
      fallback={
        <img
          src={fallbackSrc}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-contain"
          style={{ objectPosition: 'center center' }}
        />
      }
    >
      <HeroScene />
    </SceneCanvas>
  );
}

interface ScrollJourneyWrapperProps {
  progress: number;
  className?: string;
}

export function ScrollJourneyWrapper({ progress, className = '' }: ScrollJourneyWrapperProps) {
  return (
    <SceneCanvas
      className={className}
      camera={{ position: [0, 0, 7], fov: 40 }}
      fallback={<div className="w-full h-full bg-[#07111f]" aria-hidden="true" />}
    >
      <ScrollScene progress={progress} />
    </SceneCanvas>
  );
}

interface ProductVialWrapperProps {
  accentColor?: string;
  className?: string;
  fallbackSrc?: string;
  materialize?: number;
}

export function ProductVialWrapper({
  accentColor = '#2563EB',
  className = '',
  fallbackSrc = '/peptide.png',
  materialize = 1,
}: ProductVialWrapperProps) {
  return (
    <SceneCanvas
      className={className}
      camera={{ position: [0, 0.1, 5.5], fov: 36 }}
      fallback={
        <img
          src={fallbackSrc}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-contain p-8"
        />
      }
    >
      <VialScene accentColor={accentColor} materialize={materialize} />
    </SceneCanvas>
  );
}

interface ProductMorphWrapperProps {
  accentColor: string;
  prevAccentColor: string;
  morphProgress: number;
  className?: string;
  fallbackSrc?: string;
}

export function ProductMorphWrapper({
  accentColor,
  prevAccentColor,
  morphProgress,
  className = '',
  fallbackSrc = '/peptide.png',
}: ProductMorphWrapperProps) {
  return (
    <SceneCanvas
      className={className}
      camera={{ position: [0, 0.1, 5.5], fov: 36 }}
      fallback={
        <img
          src={fallbackSrc}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-contain p-6"
        />
      }
    >
      <MorphScene
        accentColor={accentColor}
        prevAccentColor={prevAccentColor}
        morphProgress={morphProgress}
      />
    </SceneCanvas>
  );
}

interface CTAConvergenceWrapperProps {
  className?: string;
}

export function CTAConvergenceWrapper({ className = '' }: CTAConvergenceWrapperProps) {
  return (
    <SceneCanvas
      className={className}
      camera={{ position: [0, 0, 6], fov: 42 }}
      fallback={<div className="w-full h-full bg-[#111111]" aria-hidden="true" />}
    >
      <CTAScene converge={0.65} />
    </SceneCanvas>
  );
}

interface ScientificDiagramWrapperProps {
  className?: string;
  color?: string;
  accentColor?: string;
}

export function ScientificDiagramWrapper({
  className = '',
  color = '#2563EB',
  accentColor = '#7DD3FC',
}: ScientificDiagramWrapperProps) {
  return (
    <SceneCanvas
      className={className}
      camera={{ position: [0, 0, 4.5], fov: 38 }}
      fallback={
        <div
          className="w-full h-full flex items-center justify-center"
          aria-hidden="true"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(37,99,235,0.08) 0%, transparent 70%)',
          }}
        />
      }
    >
      <DiagramScene color={color} accentColor={accentColor} />
    </SceneCanvas>
  );
}
