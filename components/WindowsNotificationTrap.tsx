"use client";

import { useEffect, useState, useRef } from "react";
import { Usb, X } from "lucide-react";

export default function WindowsNotificationTrap() {
  const [isActive, setIsActive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const activeRef = useRef(false);

  useEffect(() => {
    const handleTrigger = () => {
      // Evitar múltiples activaciones simultáneas
      if (activeRef.current) return;
      activeRef.current = true;
      setIsActive(true);
      
      let loopCount = 0;
      
      const playCycle = () => {
        // Detenerse después de 15 repeticiones
        if (loopCount > 15) {
          activeRef.current = false;
          setIsActive(false);
          return;
        }
        loopCount++;
        
        // 1. Deslizar hacia adentro
        setIsVisible(true);
        
        // 2. Esperar 1.5s visible y deslizar hacia afuera
        setTimeout(() => {
          setIsVisible(false);
          
          // 3. Esperar 0.5s fuera de la pantalla antes de repetir
          setTimeout(() => {
            playCycle();
          }, 500);
        }, 1500);
      };
      
      // Esperar un momentito antes de empezar la primera vez
      setTimeout(playCycle, 300);
    };

    window.addEventListener("trigger-sqli-trap", handleTrigger as EventListener);
    return () => window.removeEventListener("trigger-sqli-trap", handleTrigger as EventListener);
  }, []);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] pointer-events-none overflow-x-hidden p-2">
      <div
        className={`bg-[#242424] text-white w-80 md:w-96 rounded shadow-[0_8px_16px_rgba(0,0,0,0.5)] border border-[#3b3b3b] pointer-events-auto transition-transform duration-300 ease-in-out ${
          isVisible ? 'translate-x-0' : 'translate-x-[120%]'
        }`}
      >
        <div className="flex items-start p-4">
          <div className="bg-[#0078d7] text-white p-2 rounded-sm mr-4 flex-shrink-0">
            <Usb className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-semibold text-sm">Dispositivo USB no reconocido</h4>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-300">
              El último dispositivo USB que conectó a este equipo no funcionó correctamente y Windows no lo reconoció.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
