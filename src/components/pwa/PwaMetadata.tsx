import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const metadata = [["theme-color", "#4f55a8"], ["mobile-web-app-capable", "yes"], ["apple-mobile-web-app-capable", "yes"], ["apple-mobile-web-app-title", "Kahu"], ["apple-mobile-web-app-status-bar-style", "default"]] as const;

export function PwaMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === "/") return;
    const created: HTMLElement[] = metadata.map(([name, content]) => {
      const element = document.createElement("meta"); element.name = name; element.content = content; document.head.appendChild(element); return element;
    });
    for (const [rel, href] of [["manifest", "/manifest.json"], ["apple-touch-icon", "/icons/037-pet-care.png"]]) {
      const element = document.createElement("link"); element.rel = rel; element.href = href; document.head.appendChild(element); created.push(element);
    }
    return () => created.forEach((element) => element.remove());
  }, [pathname]);
  return null;
}
