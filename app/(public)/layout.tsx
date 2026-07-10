import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingTicketButton from "@/components/FloatingTicketButton";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col relative" style={{ backgroundColor: '#f1f5f9' }}>
        {/* Fondo decorativo premium con rejilla y orbes de luz */}
        <div className="fixed inset-0 pointer-events-none" style={{ top: '64px', zIndex: 0 }}>
          {/* Degradado moderno de pizarra/azul/gris */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]" />
          
          {/* Cuadrícula sutil de puntos de precisión */}
          <div 
            className="absolute inset-0 opacity-[0.3]" 
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #cbd5e1 1.2px, transparent 0)', 
              backgroundSize: '28px 28px'
            }} 
          />
          
          {/* Orbes de luz coloridos con desenfoque extremo para profundidad */}
          <div className="absolute top-[15%] right-[-10%] w-[600px] h-[600px] bg-[#f07639]/[0.05] rounded-full blur-[130px]" />
          <div className="absolute bottom-[20%] left-[-15%] w-[700px] h-[700px] bg-blue-500/[0.04] rounded-full blur-[140px]" />
        </div>

        {/* Contenido de la página */}
        <div className="relative z-10 flex flex-col flex-1">
          {children}
        </div>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      <FloatingTicketButton />
    </>
  );
}
