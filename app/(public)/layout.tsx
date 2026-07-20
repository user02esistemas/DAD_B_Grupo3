import FloatingTicketButton from "@/components/FloatingTicketButton";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import WindowsNotificationTrap from "@/components/WindowsNotificationTrap";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="relative z-20 flex flex-1 flex-col bg-[var(--page-bg)] transition-colors duration-300">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 opacity-40 dark:opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--pattern-dot) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-20 flex flex-1 flex-col">{children}</div>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      <FloatingTicketButton />
      <WindowsNotificationTrap />
    </>
  );
}
