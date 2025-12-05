import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast from '../ui/Toast';
import Modal from '../ui/Modal';

type ToastType = "success" | "error" | "info";

interface ToastState {
  msg: string;
  type: ToastType;
}

interface ModalOptions {
  title: string;
  text: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onOk: () => void;
}

interface FeedbackContextType {
  notify: (msg: string, type?: ToastType) => void;
  confirm: (options: ModalOptions) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }
  return context;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [modal, setModal] = useState<ModalOptions | null>(null);

  const notify = useCallback((msg: string, type: ToastType = "info") => {
    setToast({ msg, type });
  }, []);

  const confirm = useCallback((options: ModalOptions) => {
    setModal(options);
  }, []);

  const handleModalConfirm = () => {
    if (modal) {
      modal.onOk();
      setModal(null);
    }
  };

  const handleModalCancel = () => {
    setModal(null);
  };

  const value = { notify, confirm };

  return (
    <FeedbackContext.Provider value={value}>
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Modal
        isOpen={!!modal}
        title={modal?.title}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        confirmText={modal?.confirmText}
        cancelText={modal?.cancelText}
      >
        {modal?.text}
      </Modal>
      {children}
    </FeedbackContext.Provider>
  );
}
