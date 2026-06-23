"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  "/prom_1.png",
  "/prom_2.png",
  "/prom_3.png",
  "/prom_4.png",
];

export default function Carousel() {
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
    <div className="relative w-full h-[300px] md:h-[450px] lg:h-[600px] group overflow-hidden bg-gray-100">
      {/* Slides */}
      <div
        className="w-full h-full flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <img
            key={index}
            src={slide}
            alt={`Promoción ${index + 1}`}
            className="w-full h-full object-contain flex-shrink-0"
          />
        ))}
      </div>

      {/* Left Arrow */}
      <div className="absolute top-[50%] -translate-y-1/2 left-5 text-2xl rounded-full p-2 bg-black/20 text-white cursor-pointer hover:bg-black/50 transition opacity-0 group-hover:opacity-100" onClick={goToPrevious}>
        <ChevronLeft size={30} />
      </div>

      {/* Right Arrow */}
      <div className="absolute top-[50%] -translate-y-1/2 right-5 text-2xl rounded-full p-2 bg-black/20 text-white cursor-pointer hover:bg-black/50 transition opacity-0 group-hover:opacity-100" onClick={goToNext}>
        <ChevronRight size={30} />
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {slides.map((_, slideIndex) => (
          <div
            key={slideIndex}
            onClick={() => goToSlide(slideIndex)}
            className={`transition-all w-3 h-3 rounded-full cursor-pointer ${currentIndex === slideIndex ? "bg-[#f07639] w-6" : "bg-white/50 hover:bg-white"
              }`}
          ></div>
        ))}
      </div>
    </div>
  );
}
