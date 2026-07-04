/// <reference types="vite/client" />

// React 18 forwards only the lowercase `fetchpriority` attribute to the DOM
// (camelCase `fetchPriority` triggers an unknown-prop warning), but the
// bundled React types only declare the camelCase name.
import 'react';

declare module 'react' {
  interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
    fetchpriority?: 'high' | 'low' | 'auto';
  }
}
