import { useEffect, useRef } from 'react';

export default function NetworkCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let ancho = (canvas.width = window.innerWidth);
    let alto = (canvas.height = window.innerHeight);

    const handleResize = () => {
      ancho = canvas.width = window.innerWidth;
      alto = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const mouse = { x: null, y: null };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const particulas = [];
    const totalParticulas = 50;

    for (let i = 0; i < totalParticulas; i++) {
      particulas.push({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        radio: Math.random() * 2 + 2,
      });
    }

    let animationId;

    const animarRed = () => {
      ctx.clearRect(0, 0, ancho, alto);

      for (let i = 0; i < particulas.length; i++) {
        const p = particulas[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > ancho) p.vx *= -1;
        if (p.y < 0 || p.y > alto) p.vy *= -1;

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

      animationId = requestAnimationFrame(animarRed);
    };

    animarRed();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-auto z-0"
    />
  );
}
