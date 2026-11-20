import { useEffect, useRef } from 'react';

/**
 * Red de nodos animada (identidad visual de Capacita).
 * En el login va a plena intensidad; dentro de la app se usa más tenue y con menos nodos.
 * Respeta «reducir movimiento» (dibuja un solo cuadro) y se pausa con la pestaña oculta.
 */
export default function NetworkCanvas({ densidad = 1, opacidad = 1, className = 'fixed inset-0 w-full h-full pointer-events-auto z-0' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let ancho = (canvas.width = window.innerWidth);
    let alto = (canvas.height = window.innerHeight);

    const mouse = { x: null, y: null };
    const handleMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const handleMouseLeave = () => { mouse.x = null; mouse.y = null; };

    const particulas = [];
    const crear = () => {
      // 50 nodos en una pantalla de escritorio; proporcional al área para no saturar el móvil.
      const total = Math.max(14, Math.round(Math.min(50, (ancho * alto) / 26000) * densidad));
      particulas.length = 0;
      for (let i = 0; i < total; i++) {
        particulas.push({
          x: Math.random() * ancho,
          y: Math.random() * alto,
          vx: (Math.random() - 0.5) * 1,
          vy: (Math.random() - 0.5) * 1,
          radio: Math.random() * 2 + 2,
        });
      }
    };
    crear();

    let animationId = null;

    function dibujar(mover) {
      ctx.clearRect(0, 0, ancho, alto);
      ctx.globalAlpha = opacidad;
      for (let i = 0; i < particulas.length; i++) {
        const p = particulas[i];
        if (mover) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > ancho) p.vx *= -1;
          if (p.y < 0 || p.y > alto) p.vy *= -1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(37, 99, 235, 0.7)';
        ctx.fill();

        for (let j = i + 1; j < particulas.length; j++) {
          const p2 = particulas[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distancia = Math.sqrt(dx * dx + dy * dy);
          if (distancia < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${1 - distancia / 120})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        if (mouse.x !== null) {
          const dxMouse = p.x - mouse.x;
          const dyMouse = p.y - mouse.y;
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
          if (distMouse < 140) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${1 - distMouse / 140})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    const handleResize = () => {
      ancho = canvas.width = window.innerWidth;
      alto = canvas.height = window.innerHeight;
      crear();
      if (quieto) dibujar(false);
    };

    const animarRed = () => {
      dibujar(true);
      animationId = requestAnimationFrame(animarRed);
    };
    const detener = () => { if (animationId !== null) cancelAnimationFrame(animationId); animationId = null; };
    const handleVisibilidad = () => {
      if (document.hidden) detener();
      else if (animationId === null) animarRed();
    };

    window.addEventListener('resize', handleResize);
    if (quieto) {
      dibujar(false);
    } else {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('visibilitychange', handleVisibilidad);
      animarRed();
    }

    return () => {
      detener();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilidad);
    };
  }, [densidad, opacidad]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
