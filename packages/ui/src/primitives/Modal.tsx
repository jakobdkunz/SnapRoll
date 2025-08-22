import * as React from 'react';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, children }) => {
  const [mounted, setMounted] = React.useState(open);
  const [visible, setVisible] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      // allow paint, then animate in
      const id = window.setTimeout(() => setVisible(true), 10);
      return () => window.clearTimeout(id);
    }
    // animate out before unmounting
    setVisible(false);
    const id = window.setTimeout(() => setMounted(false), 160);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className={`absolute inset-0 bg-black/50`} />
      <div
        className={`${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} relative z-10 transition-all duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
