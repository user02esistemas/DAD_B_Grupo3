"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import Image from "next/image";

const slides = [
  "/prom_1.webp",
  "/prom_2.webp",
  "/prom_3.webp",
  "/prom_4.webp",
];

export default function AdsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex === slides.length - 1 ? 0 : prevIndex + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? slides.length - 1 : prevIndex - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === slides.length - 1 ? 0 : prevIndex + 1));
  };

  const goToSlide = (slideIndex: number) => {
    setCurrentIndex(slideIndex);
  };

  return (
    <div className="group relative mx-auto h-[500px] w-full max-w-[375px] overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-md)] transition-colors md:h-[600px]">
      {/* Slides */}
      <div
        className="w-full h-full flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div key={index} className="w-full h-full relative flex-shrink-0">
            <Image
              src={slide}
              alt={`Publicidad ${index + 1}`}
              fill
              sizes="375px"
              priority={index === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Left Arrow */}
      <div className="absolute top-[50%] -translate-y-1/2 left-4 text-2xl rounded-full p-2 bg-black/30 dark:bg-black/50 text-white cursor-pointer hover:bg-black/60 dark:hover:bg-black/70 transition opacity-0 group-hover:opacity-100" onClick={goToPrevious}>
        <ChevronLeft size={24} />
      </div>

      {/* Right Arrow */}
      <div className="absolute top-[50%] -translate-y-1/2 right-4 text-2xl rounded-full p-2 bg-black/30 dark:bg-black/50 text-white cursor-pointer hover:bg-black/60 dark:hover:bg-black/70 transition opacity-0 group-hover:opacity-100" onClick={goToNext}>
        <ChevronRight size={24} />
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {slides.map((_, slideIndex) => (
          <div
            key={slideIndex}
            onClick={() => goToSlide(slideIndex)}
            className={`transition-all w-2.5 h-2.5 rounded-full cursor-pointer shadow-sm ${
              currentIndex === slideIndex ? "bg-[#f07639] w-6" : "bg-gray-300 dark:bg-slate-500 hover:bg-white dark:hover:bg-slate-300"
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
}
