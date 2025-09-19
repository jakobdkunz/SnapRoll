'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, children }) => {
  const [mounted, setMounted] = React.useState(open);
  const [visible, setVisible] = React.useState(open);
  const [portalEl, setPortalEl] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setPortalEl(document.body);
  }, []);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.setTimeout(() => setVisible(true), 10);
      return () => window.clearTimeout(id);
    }
    setVisible(false);
    const id = window.setTimeout(() => setMounted(false), 160);
    return () => window.clearTimeout(id);
  }, [open]);

  React.useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!mounted || !portalEl) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[1000] flex items-center justify-center ${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150 ease-out`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Oversized overlay to cover iOS toolbars */}
      <div className="absolute left-0 right-0 bg-black/50" style={{ top: '-60vh', bottom: '-60vh' }} />
      <div
        className={`${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1.5'} relative z-10 transition-all duration-150 ease-out`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    portalEl
  );
};
