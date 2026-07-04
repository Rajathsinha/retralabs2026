import { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  pageKey: string;
}

export default function PageTransition({ children, pageKey }: PageTransitionProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => setShow(true));
    });
    return () => cancelAnimationFrame(timer);
  }, [pageKey]);

  return (
    <div
      className={`transition-all duration-400 ease-out ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{ transitionDuration: '400ms' }}
    >
      {children}
    </div>
  );
}
