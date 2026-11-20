// Mini cadena de nodos para las tarjetas de Mi biblioteca: un nodo = herramienta simple,
// varios nodos conectados = combinada (los pasos de una solución). Solo decorativa.
const POSICIONES = {
  1: [[22, 22]],
  2: [[12, 27], [32, 17]],
  3: [[9, 28], [22, 15], [35, 27]],
  4: [[7, 27], [17, 15], [28, 29], [38, 16]],
};
const COLORES = ['#3b82f6', '#6366f1', '#06b6d4', '#4f46e5'];

export default function MiniCadena({ pasos = 1 }) {
  const puntos = POSICIONES[Math.max(1, Math.min(4, Number(pasos) || 1))];
  const ruta = puntos.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');
  return <svg className="mini-cadena" viewBox="0 0 44 44" fill="none" aria-hidden="true">
    {puntos.length > 1 && <path d={ruta} stroke="#9db5ec" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" />}
    {puntos.map(([x, y], index) => <g key={index}>
      <circle cx={x} cy={y} r={puntos.length === 1 ? 8 : 5} fill="#fff" stroke={COLORES[index]} strokeWidth="2" />
      <circle cx={x} cy={y} r={puntos.length === 1 ? 3.2 : 2} fill={COLORES[index]} />
    </g>)}
  </svg>;
}
