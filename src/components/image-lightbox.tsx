'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageLightboxProps {
  srcLight: string;
  srcDark: string;
  alt: string;
}

export function ImageLightbox({ srcLight, srcDark, alt }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative w-full aspect-[16/5] sm:aspect-[16/4] md:aspect-[21/9] lg:aspect-[21/7] mb-8 cursor-zoom-in group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
        aria-label={`View larger image for ${alt}`}
      >
        <Image src={srcLight} alt={alt} fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-contain block dark:hidden rounded-lg transition-transform group-hover:scale-105" />
        <Image src={srcDark} alt={alt} fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-contain hidden dark:block rounded-lg transition-transform group-hover:scale-105" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Image viewer for ${alt}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <Image src={srcLight} alt={alt} fill sizes="90vw" className="object-contain block dark:hidden" />
            <Image src={srcDark} alt={alt} fill sizes="90vw" className="object-contain hidden dark:block" />
          </div>
           <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-white text-4xl font-bold hover:text-gray-300 transition-colors"
            aria-label="Close image viewer"
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}