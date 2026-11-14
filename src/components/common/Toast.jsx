export default function Toast({ mensaje, visible }) {
  return (
    <div
      className={`mensaje-toast ${visible ? 'mostrar' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span>{mensaje}</span>
    </div>
  );
}
