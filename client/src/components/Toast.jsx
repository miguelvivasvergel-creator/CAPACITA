export default function Toast({ message, isVisible }) {
  return (
    <div
      className={`mensaje-toast ${isVisible ? "mostrar" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
    </div>
  );
}
