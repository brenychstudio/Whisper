import { useEffect, useMemo, useState } from "react";
import styles from "./PrintModal.module.css";

export default function PrintModal({ open, onClose, item }) {
  const [sizeKey, setSizeKey] = useState(null);

  const sizes = item?.sizes ?? [];

  useEffect(() => {
    if (!open || !item) return;
    // default = smallest
    const first = sizes?.[0]?.key ?? null;
    setSizeKey(first);
  }, [open, item]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo(() => {
    if (!sizes?.length) return null;
    return sizes.find((s) => s.key === sizeKey) ?? sizes[0];
  }, [sizes, sizeKey]);

  // lock scroll + ESC close
  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !item) return null;

  return (
    <div className={styles.backdrop} onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.media}>
          <img src={item.src} alt={item.title} />
        </div>

        <div className={styles.panel}>
          <div className={styles.head}>
            <div className={styles.title}>{item.title}</div>
            <div className={styles.meta}>
              {item.edition ? <div>{item.edition}</div> : null}
              {item.paper ? <div>{item.paper}</div> : null}
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.label}>Size</div>

            <div className={styles.sizes}>
              {sizes.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`${styles.sizeBtn} ${s.key === selected?.key ? styles.sizeBtnActive : ""}`}
                  onClick={() => setSizeKey(s.key)}
                >
                  <span className={styles.sizeText}>{s.label}</span>
                  <span className={styles.sizePrice}>€{s.price}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.row}>
              <span className={styles.muted}>Price</span>
              <span className={styles.price}>€{selected?.price ?? ""}</span>
            </div>

            {item.coa ? (
              <div className={styles.row}>
                <span className={styles.muted}>Includes</span>
                <span className={styles.value}>COA · Signed & numbered</span>
              </div>
            ) : null}

            {item.shipping ? (
              <div className={styles.row}>
                <span className={styles.muted}>Shipping</span>
                <span className={styles.value}>{item.shipping}</span>
              </div>
            ) : null}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => alert("Purchase flow later")}>
              Purchase
            </button>
            <button type="button" className={styles.ghost} onClick={onClose}>
              Close
            </button>
          </div>

          <div className={styles.hint}>
            Tip: ESC to close
          </div>
        </div>
      </div>
    </div>
  );
}
