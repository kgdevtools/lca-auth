"use client";

import { useEffect, useState, useRef } from "react";

interface ScrollNavbarProps {
  children: React.ReactNode;
}

export function ScrollNavbar({ children }: ScrollNavbarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        // Show navbar when scrolling up OR at the very top of page
        if (currentScrollY < lastScrollY.current || currentScrollY < 10) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
        lastScrollY.current = currentScrollY;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 w-full z-50 transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {children}
    </div>
  );
}