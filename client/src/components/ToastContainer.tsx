import { useToast } from '../context/ToastContext';
import '../styles/Toast.css';

const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io/tx/';

const icons: Record<string, string> = {
  success: '✅',
  error: '❌',
  pending: '⏳',
  info: 'ℹ️',
};

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <div className="toast-icon">{icons[toast.type]}</div>
          <div className="toast-content">
            <p className="toast-title">{toast.title}</p>
            {toast.message && <p className="toast-message">{toast.message}</p>}
            {toast.txHash && (
              <a
                href={`${SEPOLIA_EXPLORER}${toast.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="toast-link"
              >
                View on Etherscan ↗
              </a>
            )}
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
