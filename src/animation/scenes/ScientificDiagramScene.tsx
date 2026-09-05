import { MolecularDiagram } from '../primitives/MolecularDiagram';

interface ScientificDiagramSceneProps {
  color?: string;
  accentColor?: string;
}

export default function ScientificDiagramScene({
  color = '#2563EB',
  accentColor = '#7DD3FC',
}: ScientificDiagramSceneProps) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[2, 4, 3]} intensity={0.8} />
      <directionalLight position={[-2, 1, -2]} intensity={0.25} color={accentColor} />
      <MolecularDiagram color={color} accentColor={accentColor} />
    </>
  );
}
