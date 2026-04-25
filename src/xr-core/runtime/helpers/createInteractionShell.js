export function createInteractionShell({
  mount = document.body,
}) {
  const rail = document.createElement("div");
  rail.style.position = "absolute";
  rail.style.left = "0";
  rail.style.right = "0";
  rail.style.bottom = "0";
  rail.style.padding = "20px 16px";
  rail.style.display = "flex";
  rail.style.justifyContent = "center";
  rail.style.pointerEvents = "none";
  rail.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  rail.style.zIndex = "20";

  const railInner = document.createElement("div");
  railInner.style.minWidth = "min(92vw, 820px)";
  railInner.style.border = "1px solid rgba(255,255,255,0.12)";
  railInner.style.background = "rgba(4,6,10,0.34)";
  railInner.style.backdropFilter = "blur(10px)";
  railInner.style.webkitBackdropFilter = "blur(10px)";
  railInner.style.padding = "12px 14px";
  railInner.style.display = "flex";
  railInner.style.alignItems = "center";
  railInner.style.gap = "14px";
  railInner.style.opacity = "0";
  railInner.style.transition = "opacity 220ms ease";
  railInner.style.boxShadow = "0 10px 30px rgba(0,0,0,0.18)";

  const railTitle = document.createElement("div");
  railTitle.style.fontSize = "10px";
  railTitle.style.letterSpacing = "0.24em";
  railTitle.style.textTransform = "uppercase";
  railTitle.style.color = "rgba(255,255,255,0.86)";
  railTitle.style.minWidth = "92px";
  railTitle.style.flexShrink = "0";

  const railCaption = document.createElement("div");
  railCaption.style.fontSize = "12px";
  railCaption.style.lineHeight = "1.35";
  railCaption.style.color = "rgba(255,255,255,0.68)";
  railCaption.style.flex = "1";
  railCaption.style.whiteSpace = "nowrap";
  railCaption.style.overflow = "hidden";
  railCaption.style.textOverflow = "ellipsis";

  const railHint = document.createElement("div");
  railHint.style.fontSize = "10px";
  railHint.style.letterSpacing = "0.18em";
  railHint.style.textTransform = "uppercase";
  railHint.style.color = "rgba(255,255,255,0.46)";
  railHint.style.whiteSpace = "nowrap";
  railHint.style.flexShrink = "0";
  railHint.textContent = "C copy • O open";

  const railMeter = document.createElement("div");
  railMeter.style.width = "132px";
  railMeter.style.height = "3px";
  railMeter.style.background = "rgba(255,255,255,0.12)";
  railMeter.style.position = "relative";
  railMeter.style.overflow = "hidden";
  railMeter.style.borderRadius = "999px";
  railMeter.style.flexShrink = "0";

  const railMeterFill = document.createElement("div");
  railMeterFill.style.height = "100%";
  railMeterFill.style.width = "0%";
  railMeterFill.style.background = "linear-gradient(90deg, rgba(155,188,255,0.78), rgba(255,255,255,0.88))";
  railMeterFill.style.borderRadius = "999px";
  railMeterFill.style.boxShadow = "0 0 14px rgba(155,188,255,0.18)";
  railMeterFill.style.transition = "width 120ms linear";

  railMeter.appendChild(railMeterFill);
  railInner.appendChild(railTitle);
  railInner.appendChild(railCaption);
  railInner.appendChild(railHint);
  railInner.appendChild(railMeter);
  rail.appendChild(railInner);

  const desktopHint = document.createElement("div");
  desktopHint.style.position = "absolute";
  desktopHint.style.left = "16px";
  desktopHint.style.bottom = "16px";
  desktopHint.style.padding = "10px 12px";
  desktopHint.style.border = "1px solid rgba(255,255,255,0.12)";
  desktopHint.style.background = "rgba(4,6,10,0.28)";
  desktopHint.style.backdropFilter = "blur(8px)";
  desktopHint.style.webkitBackdropFilter = "blur(8px)";
  desktopHint.style.color = "rgba(255,255,255,0.78)";
  desktopHint.style.fontSize = "10px";
  desktopHint.style.letterSpacing = "0.20em";
  desktopHint.style.textTransform = "uppercase";
  desktopHint.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  desktopHint.style.pointerEvents = "none";
  desktopHint.style.zIndex = "20";
  desktopHint.textContent = "Desktop Preview";

  const vrHint = document.createElement("div");
  vrHint.style.position = "absolute";
  vrHint.style.left = "50%";
  vrHint.style.top = "18px";
  vrHint.style.transform = "translateX(-50%)";
  vrHint.style.padding = "10px 14px";
  vrHint.style.border = "1px solid rgba(255,255,255,0.10)";
  vrHint.style.background = "rgba(4,6,10,0.24)";
  vrHint.style.backdropFilter = "blur(8px)";
  vrHint.style.webkitBackdropFilter = "blur(8px)";
  vrHint.style.color = "rgba(255,255,255,0.76)";
  vrHint.style.fontSize = "10px";
  vrHint.style.letterSpacing = "0.18em";
  vrHint.style.textTransform = "uppercase";
  vrHint.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  vrHint.style.pointerEvents = "none";
  vrHint.style.zIndex = "20";
  vrHint.style.opacity = "0";
  vrHint.style.transition = "opacity 180ms ease";
  vrHint.textContent = "Look to focus • Hold to move forward";

  mount.appendChild(rail);
  mount.appendChild(desktopHint);
  mount.appendChild(vrHint);

  const setRail = ({ pid = "", caption = "", visible = false, hintOpacity = 1 } = {}) => {
    if (visible) {
      railInner.style.opacity = "1";
      railTitle.textContent = pid;
      railCaption.textContent = caption;
      railHint.style.opacity = String(hintOpacity);
    } else {
      railInner.style.opacity = "0";
      railTitle.textContent = "";
      railCaption.textContent = "";
      railHint.style.opacity = "0.82";
    }
  };

  const setMeterProgress = (p = 0) => {
    const safe = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
    railMeterFill.style.width = `${Math.round(safe * 100)}%`;
  };

  const setDesktopHint = (text) => {
    if (typeof text === "string" && text.trim()) {
      desktopHint.textContent = text;
    }
  };

  const setDesktopHintVisible = (visible) => {
    desktopHint.style.opacity = visible ? "1" : "0";
  };

  const setVRHint = (text) => {
    if (typeof text === "string" && text.trim()) {
      vrHint.textContent = text;
    }
  };

  const setVRHintVisible = (visible) => {
    vrHint.style.opacity = visible ? "1" : "0";
  };

  const dispose = () => {
    try { rail.remove(); } catch {}
    try { desktopHint.remove(); } catch {}
    try { vrHint.remove(); } catch {}
  };

  return {
    rail,
    railInner,
    railTitle,
    railCaption,
    railHint,
    railMeter,
    railMeterFill,
    desktopHint,
    vrHint,
    setRail,
    setMeterProgress,
    setDesktopHint,
    setDesktopHintVisible,
    setVRHint,
    setVRHintVisible,
    dispose,
  };
}
