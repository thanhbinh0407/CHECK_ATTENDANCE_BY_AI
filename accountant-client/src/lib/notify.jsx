import React, { useEffect, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/** One-way toasts auto-dismiss after this many ms (~3s per product request). */
export const TOAST_DURATION_MS = 3000;

const defaultOpts = {
  autoClose: TOAST_DURATION_MS,
  pauseOnHover: true,
};

export function toastSuccess(message, options = {}) {
  toast.success(message, { ...defaultOpts, ...options });
}

export function toastError(message, options = {}) {
  toast.error(message, { ...defaultOpts, ...options });
}

export function toastInfo(message, options = {}) {
  toast.info(message, { ...defaultOpts, ...options });
}

export function toastWarning(message, options = {}) {
  toast.warning(message, { ...defaultOpts, ...options });
}

const confirmToastOpts = {
  autoClose: false,
  closeOnClick: false,
  closeButton: false,
  draggable: false,
};

/**
 * @param {{ message: React.ReactNode, title?: string, confirmText?: string, cancelText?: string }} opts
 * @returns {Promise<boolean>}
 */
export function toastConfirm({
  message,
  title,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) {
  return new Promise((resolve) => {
    toast(
      ({ closeToast }) => (
        <div style={{ minWidth: 240 }}>
          {title ? (
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
          ) : null}
          <div style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }}>{message}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                resolve(false);
                closeToast();
              }}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                border: '1px solid #ccc',
                borderRadius: 6,
                background: '#f5f5f5',
              }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                resolve(true);
                closeToast();
              }}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                border: 'none',
                borderRadius: 6,
                background: '#2563eb',
                color: '#fff',
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      ),
      confirmToastOpts
    );
  });
}

function PromptToastBody({
  message,
  inputType,
  placeholder,
  confirmText,
  cancelText,
  closeToast,
  resolve,
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const submit = () => {
    resolve(value);
    closeToast();
  };
  const cancel = () => {
    resolve(null);
    closeToast();
  };

  return (
    <div style={{ minWidth: 280 }}>
      <div style={{ marginBottom: 10, whiteSpace: 'pre-wrap' }}>{message}</div>
      <input
        ref={inputRef}
        type={inputType}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') cancel();
        }}
        style={{
          width: '100%',
          padding: 8,
          marginBottom: 12,
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          boxSizing: 'border-box',
        }}
        autoComplete={inputType === 'password' ? 'current-password' : 'off'}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={cancel}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            border: '1px solid #ccc',
            borderRadius: 6,
            background: '#f5f5f5',
          }}
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={submit}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            border: 'none',
            borderRadius: 6,
            background: '#2563eb',
            color: '#fff',
          }}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}

/**
 * Custom prompt inside a toast (replaces window.prompt).
 * @returns {Promise<string|null>} entered string, or null if cancelled
 */
export function toastPrompt({
  message,
  inputType = 'text',
  placeholder = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
}) {
  return new Promise((resolve) => {
    toast(
      ({ closeToast }) => (
        <PromptToastBody
          message={message}
          inputType={inputType}
          placeholder={placeholder}
          confirmText={confirmText}
          cancelText={cancelText}
          closeToast={closeToast}
          resolve={resolve}
        />
      ),
      confirmToastOpts
    );
  });
}

export function AppToastContainer() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={TOAST_DURATION_MS}
      newestOnTop
      limit={6}
      pauseOnHover
      pauseOnFocusLoss
      draggable
      theme="light"
      style={{ pointerEvents: 'none' }}
      toastStyle={{ pointerEvents: 'auto' }}
    />
  );
}
