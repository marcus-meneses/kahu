export type NorsteinInteraction = {
  id: string;
  route: string;
  role: string;
  label: string;
  disabled: boolean;
  operation?: string;
  audience?: "KAHU" | "ZEAL";
};

declare global {
  interface Window {
    __KAHU_NORSTEIN__?: { version: 1; snapshot: () => NorsteinInteraction[] };
  }
}

const selector = [
  "a[href]", "button", "input", "select", "textarea", "summary",
  "[role='button']", "[role='link']", "[role='menuitem']", "[role='option']",
  "[role='tab']", "[role='checkbox']", "[role='radio']", "[role='switch']",
  "[contenteditable='true']", "[data-norstein-id]",
].join(",");

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, 160);
const slug = (value: string) => normalize(value).toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const roleOf = (element: HTMLElement) => element.getAttribute("role") || ({
  A: "link", BUTTON: "button", SELECT: "select", TEXTAREA: "textbox", SUMMARY: "button",
}[element.tagName] ?? (element instanceof HTMLInputElement ? element.type || "input" : element.tagName.toLowerCase()));

const labelOf = (element: HTMLElement) => normalize(
  element.getAttribute("aria-label")
    || (element instanceof HTMLInputElement ? element.labels?.[0]?.textContent || element.placeholder : "")
    || element.getAttribute("title")
    || element.textContent
    || "",
);

const describe = (element: HTMLElement): NorsteinInteraction => {
  const route = location.pathname;
  const role = roleOf(element);
  const label = labelOf(element);
  const baseId = `${slug(route) || "root"}.${slug(role)}.${slug(label) || "unlabelled"}`;
  const peers = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((candidate) => roleOf(candidate) === role && labelOf(candidate) === label);
  const occurrence = peers.length > 1 ? `.${peers.indexOf(element) + 1}` : "";
  return {
    id: element.dataset.norsteinId || baseId + occurrence,
    route, role, label,
    disabled: element.matches(":disabled,[aria-disabled='true']"),
    operation: element.dataset.permissionOperation || undefined,
    audience: element.dataset.permissionAudience === "ZEAL" ? "ZEAL" : element.dataset.permissionOperation ? "KAHU" : undefined,
  };
};

const snapshot = () => Array.from(document.querySelectorAll<HTMLElement>(selector))
  .filter((element) => element.getClientRects().length > 0)
  .map(describe);

export const installNorsteinInteractionExport = () => {
  if (window.__KAHU_NORSTEIN__) return;
  window.__KAHU_NORSTEIN__ = { version: 1, snapshot };
  const report = (event: Event) => {
    const element = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
    if (!element) return;
    window.dispatchEvent(new CustomEvent("kahu:norstein-interaction", {
      detail: { event: event.type, interaction: describe(element), at: new Date().toISOString() },
    }));
  };
  for (const type of ["click", "change", "submit"]) document.addEventListener(type, report, true);
};
