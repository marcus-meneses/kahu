import { Loader } from "@mantine/core";
import { useDetailTransition } from "../../classes/contexts/DetailTransitionContext";

export function DetailTransitionOverlay() {
  const { active, leaving } = useDetailTransition();

  if (!active) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: "var(--kahu-sidebar-width)",
        zIndex: 2500,
        display: "grid",
        placeItems: "center",
        background: "rgba(12, 10, 24, 0.48)",
        backdropFilter: "blur(3px)",
        opacity: leaving ? 0 : 1,
        transition: "opacity 220ms ease",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          width: "clamp(52px, min(2.7083vw, 4.8148vh), 104px)",
          height: "clamp(52px, min(2.7083vw, 4.8148vh), 104px)",
          display: "grid",
          placeItems: "center",
          borderRadius: 8,
          border: "1px solid rgba(255, 255, 255, 0.24)",
          background: "rgba(255, 255, 255, 0.9)",
          boxShadow: "0 18px 45px rgba(0, 0, 0, 0.24)",
        }}
      >
        <Loader color="light.1" size="sm" />
      </div>
    </div>
  );
}
