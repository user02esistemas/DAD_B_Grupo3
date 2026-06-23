"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  "/prom_1.png",
  "/prom_2.png",
  "/prom_3.png",
  "/prom_4.png",
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
    <div className="relative mx-auto w-full max-w-[375px] h-[500px] md:h-[600px] group overflow-hidden rounded-2xl shadow-xl border border-gray-100">
      {/* Slides */}
      <div
        className="w-full h-full flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <img
            key={index}
            src={slide}
            alt={`Publicidad ${index + 1}`}
            className="w-full h-full object-cover flex-shrink-0"
          />
        ))}
      </div>

      {/* Left Arrow */}
      <div className="absolute top-[50%] -translate-y-1/2 left-4 text-2xl rounded-full p-2 bg-black/30 text-white cursor-pointer hover:bg-black/60 transition opacity-0 group-hover:opacity-100" onClick={goToPrevious}>
        <ChevronLeft size={24} />
      </div>

      {/* Right Arrow */}
      <div className="absolute top-[50%] -translate-y-1/2 right-4 text-2xl rounded-full p-2 bg-black/30 text-white cursor-pointer hover:bg-black/60 transition opacity-0 group-hover:opacity-100" onClick={goToNext}>
        <ChevronRight size={24} />
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {slides.map((_, slideIndex) => (
          <div
            key={slideIndex}
            onClick={() => goToSlide(slideIndex)}
            className={`transition-all w-2.5 h-2.5 rounded-full cursor-pointer shadow-sm ${
              currentIndex === slideIndex ? "bg-[#f07639] w-6" : "bg-gray-300 hover:bg-white"
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
}
