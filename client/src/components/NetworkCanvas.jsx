import { useEffect, useRef } from "react";

export default function NetworkCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: width * 0.5,
      y: height * 0.5,
      targetX: width * 0.5,
      targetY: height * 0.5,
      radius: 200,
      active: false,
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initNodes();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    const colorsLeft = [
      { r: 37, g: 99, b: 235 },
      { r: 6, g: 182, b: 212 },
      { r: 99, g: 102, b: 241 },
    ];

    const colorsRight = [
      { r: 255, g: 255, b: 255 },
      { r: 165, g: 243, b: 252 },
      { r: 199, g: 210, b: 254 },
    ];

    let nodes = [];
    const nodeCount = 85;

    class StylizedNode {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.55;
        this.vy = (Math.random() - 0.5) * 0.55;
        this.radius = 2.4 + Math.random() * 3.0;
        this.phase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.015 + Math.random() * 0.02;
        this.hoverFactor = 0;
      }

      getColor() {
        const isRight = this.x > width * 0.48;
        const palette = isRight ? colorsRight : colorsLeft;
        return palette[
          Math.floor(Math.abs(Math.sin(this.phase * 2)) * palette.length) %
            palette.length
        ];
      }

      update() {
        this.phase += this.pulseSpeed;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -30) this.x = width + 30;
        if (this.x > width + 30) this.x = -30;
        if (this.y < -30) this.y = height + 30;
        if (this.y > height + 30) this.y = -30;

        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius) {
            const force = 1 - dist / mouse.radius;
            this.x -= (dx / dist) * force * 3.5;
            this.y -= (dy / dist) * force * 3.5;
            this.hoverFactor = Math.min(1, this.hoverFactor + 0.06);
          } else {
            this.hoverFactor = Math.max(0, this.hoverFactor - 0.02);
          }
        } else {
          this.hoverFactor = Math.max(0, this.hoverFactor - 0.02);
        }
      }

      draw(context) {
        const color = this.getColor();
        const { r, g, b } = color;
        const currentRadius =
          this.radius * (1 + Math.sin(this.phase) * 0.2) + this.hoverFactor * 2.0;
        const haloOpacity =
          (this.x > width * 0.48 ? 0.35 : 0.22) +
          Math.sin(this.phase) * 0.08 +
          this.hoverFactor * 0.22;

        const grad = context.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          currentRadius * 4.5
        );
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${haloOpacity})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        context.beginPath();
        context.arc(this.x, this.y, currentRadius * 4.5, 0, Math.PI * 2);
        context.fillStyle = grad;
        context.fill();

        context.beginPath();
        context.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
        context.fill();

        context.beginPath();
        context.arc(this.x, this.y, currentRadius * 0.45, 0, Math.PI * 2);
        context.fillStyle = "#ffffff";
        context.fill();
      }
    }

    function initNodes() {
      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        nodes.push(new StylizedNode());
      }
    }

    initNodes();

    function animate() {
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      ctx.clearRect(0, 0, width, height);

      const maxDist = 155;
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].update();
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const isRightSide = (nodes[i].x + nodes[j].x) / 2 > width * 0.48;
            const baseAlpha = isRightSide ? 0.32 : 0.22;
            const alpha =
              (1 - dist / maxDist) * baseAlpha +
              (nodes[i].hoverFactor + nodes[j].hoverFactor) * 0.16;

            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);

            const c1 = nodes[i].getColor();
            const c2 = nodes[j].getColor();

            const grad = ctx.createLinearGradient(
              nodes[i].x,
              nodes[i].y,
              nodes[j].x,
              nodes[j].y
            );
            grad.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${alpha})`);
            grad.addColorStop(1, `rgba(${c2.r}, ${c2.g}, ${c2.b}, ${alpha})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = isRightSide ? 1.2 : 1.0;
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        nodes[i].draw(ctx);
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-auto z-0"
    />
  );
}
