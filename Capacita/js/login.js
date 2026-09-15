import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://ideubwvlffbapneqftwj.supabase.co'
const supabaseKey = 'sb_publishable_Q5ynxzxEh3b5ildr02QEXQ_eTx9xmXZ'
const supabase = createClient(supabaseUrl, supabaseKey)

"use strict";

const vistaLogin = document.getElementById("vistaLogin");
const vistaRegistro = document.getElementById("vistaRegistro");
const enlaceIrRegistro = document.getElementById("enlaceIrRegistro");
const enlaceIrLogin = document.getElementById("enlaceIrLogin");
const subtituloHero = document.getElementById("subtituloHero");
const pildoraExtra = document.getElementById("pildoraExtra");

const textoHeroLogin = "Conecta, comparte y accede a las habilidades que necesitas, sin importar tu profesión o experiencia.";
const textoHeroRegistro = "Únete a la red donde tus habilidades se transforman en soluciones. Comparte tu conocimiento y accede al talento de otros profesionales.";

function cambiarVista(modo, actualizarUrl = true) {
    if (!vistaLogin || !vistaRegistro) return;

    if (modo === "registro") {
        vistaLogin.classList.remove("vista-activa");
        vistaLogin.classList.add("vista-oculta-izq");

        vistaRegistro.classList.remove("vista-oculta-der");
        vistaRegistro.classList.add("vista-activa");

        if (subtituloHero) {
            subtituloHero.style.opacity = "0";
            window.setTimeout(() => {
                subtituloHero.textContent = textoHeroRegistro;
                subtituloHero.style.opacity = "1";
            }, 150);
        }

        if (pildoraExtra) {
            pildoraExtra.classList.remove("oculta");
        }

        document.title = "Registro de Usuario — Capacita";
        if (actualizarUrl) {
            history.pushState({ vista: "registro" }, "", "registro.html");
        }
    } else {
        vistaRegistro.classList.remove("vista-activa");
        vistaRegistro.classList.add("vista-oculta-der");

        vistaLogin.classList.remove("vista-oculta-izq");
        vistaLogin.classList.add("vista-activa");

        if (subtituloHero) {
            subtituloHero.style.opacity = "0";
            window.setTimeout(() => {
                subtituloHero.textContent = textoHeroLogin;
                subtituloHero.style.opacity = "1";
            }, 150);
        }

        if (pildoraExtra) {
            pildoraExtra.classList.add("oculta");
        }

        document.title = "Iniciar Sesión — Capacita";
        if (actualizarUrl) {
            history.pushState({ vista: "login" }, "", "index.html");
        }
    }
}

if (enlaceIrRegistro) {
    enlaceIrRegistro.addEventListener("click", () => cambiarVista("registro"));
}

if (enlaceIrLogin) {
    enlaceIrLogin.addEventListener("click", () => cambiarVista("login"));
}

window.addEventListener("popstate", (e) => {
    if (e.state && e.state.vista) {
        cambiarVista(e.state.vista, false);
    } else {
        const ruta = window.location.pathname;
        if (ruta.includes("registro")) {
            cambiarVista("registro", false);
        } else {
            cambiarVista("login", false);
        }
    }
});

document.querySelectorAll(".boton-toggle-clave").forEach(boton => {
    boton.addEventListener("click", () => {
        const campoInput = boton.parentElement.querySelector("input");
        if (!campoInput) return;
        const esPassword = campoInput.type === "password";
        campoInput.type = esPassword ? "text" : "password";

        boton.innerHTML = esPassword
            ? `<svg class="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>`
            : `<svg class="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`;
    });
});

const mensajeToast = document.getElementById("mensajeToast");
const textoToast = document.getElementById("textoToast");

function mostrarToast(mensaje) {
    if (!mensajeToast) return;
    if (textoToast) {
        textoToast.textContent = mensaje;
    } else {
        mensajeToast.textContent = mensaje;
    }
    mensajeToast.classList.add("mostrar");
    window.clearTimeout(mostrarToast.temporizador);
    mostrarToast.temporizador = window.setTimeout(() => {
        mensajeToast.classList.remove("mostrar");
    }, 3600);
}

document.querySelectorAll(".boton-google-accion").forEach(btn => {
    btn.addEventListener("click", () => {
        mostrarToast("Acceso con Google listo para conectar en backend.");
    });
});

const formInicio = document.getElementById("formularioInicio");
const entradaCorreoLogin = document.getElementById("correo");
const entradaContrasenaLogin = document.getElementById("contrasena");
const errorCorreoLogin = document.getElementById("errorCorreo");
const errorContrasenaLogin = document.getElementById("errorContrasena");
const botonInicio = document.getElementById("botonInicio");

if (formInicio) {
    formInicio.addEventListener("submit", (e) => {
        e.preventDefault();
        let valido = true;

        if (errorCorreoLogin) errorCorreoLogin.textContent = "";
        if (errorContrasenaLogin) errorContrasenaLogin.textContent = "";
        if (entradaCorreoLogin) entradaCorreoLogin.classList.remove("is-invalid");
        if (entradaContrasenaLogin) entradaContrasenaLogin.classList.remove("is-invalid");

        const correo = entradaCorreoLogin ? entradaCorreoLogin.value.trim() : "";
        const contrasena = entradaContrasenaLogin ? entradaContrasenaLogin.value : "";

        if (!correo) {
            if (errorCorreoLogin) errorCorreoLogin.textContent = "Ingresa tu correo electrónico.";
            if (entradaCorreoLogin) entradaCorreoLogin.classList.add("is-invalid");
            valido = false;
        } else if (entradaCorreoLogin && !entradaCorreoLogin.validity.valid) {
            if (errorCorreoLogin) errorCorreoLogin.textContent = "Ingresa un correo válido.";
            if (entradaCorreoLogin) entradaCorreoLogin.classList.add("is-invalid");
            valido = false;
        }

        if (!contrasena) {
            if (errorContrasenaLogin) errorContrasenaLogin.textContent = "Ingresa tu contraseña.";
            if (entradaContrasenaLogin) entradaContrasenaLogin.classList.add("is-invalid");
            valido = false;
        } else if (contrasena.length < 6) {
            if (errorContrasenaLogin) errorContrasenaLogin.textContent = "La contraseña debe tener al menos 6 caracteres.";
            if (entradaContrasenaLogin) entradaContrasenaLogin.classList.add("is-invalid");
            valido = false;
        }

        if (valido && botonInicio) {
            const textoOriginal = botonInicio.querySelector(".texto-boton");
            if (textoOriginal) textoOriginal.textContent = "Iniciando sesión...";
            botonInicio.disabled = true;

            window.setTimeout(() => {
                if (textoOriginal) textoOriginal.textContent = "Iniciar sesión";
                botonInicio.disabled = false;
                mostrarToast("Sesión iniciada correctamente.");
            }, 750);
        }
    });
}

const formRegistro = document.getElementById("formularioRegistro");
const entradaNombreReg = document.getElementById("fullname");
const entradaCorreoReg = document.getElementById("emailRegistro");
const entradaContrasenaReg = document.getElementById("passwordRegistro");
const terminosReg = document.getElementById("terms");
const errorNombreReg = document.getElementById("errorNombre");
const errorCorreoReg = document.getElementById("errorCorreoRegistro");
const errorContrasenaReg = document.getElementById("errorContrasenaRegistro");
const botonRegistro = document.getElementById("botonRegistro");

if (formRegistro) {
    formRegistro.addEventListener("submit", (e) => {
        e.preventDefault();
        let valido = true;

        if (errorNombreReg) errorNombreReg.textContent = "";
        if (errorCorreoReg) errorCorreoReg.textContent = "";
        if (errorContrasenaReg) errorContrasenaReg.textContent = "";
        if (entradaNombreReg) entradaNombreReg.classList.remove("is-invalid");
        if (entradaCorreoReg) entradaCorreoReg.classList.remove("is-invalid");
        if (entradaContrasenaReg) entradaContrasenaReg.classList.remove("is-invalid");

        const nombre = entradaNombreReg ? entradaNombreReg.value.trim() : "";
        const correo = entradaCorreoReg ? entradaCorreoReg.value.trim() : "";
        const contrasena = entradaContrasenaReg ? entradaContrasenaReg.value : "";

        if (!nombre) {
            if (errorNombreReg) errorNombreReg.textContent = "Ingresa tu nombre completo.";
            if (entradaNombreReg) entradaNombreReg.classList.add("is-invalid");
            valido = false;
        } else if (nombre.length < 3) {
            if (errorNombreReg) errorNombreReg.textContent = "El nombre debe tener al menos 3 caracteres.";
            if (entradaNombreReg) entradaNombreReg.classList.add("is-invalid");
            valido = false;
        }

        if (!correo) {
            if (errorCorreoReg) errorCorreoReg.textContent = "Ingresa tu correo electrónico.";
            if (entradaCorreoReg) entradaCorreoReg.classList.add("is-invalid");
            valido = false;
        } else if (entradaCorreoReg && !entradaCorreoReg.validity.valid) {
            if (errorCorreoReg) errorCorreoReg.textContent = "Ingresa un correo válido.";
            if (entradaCorreoReg) entradaCorreoReg.classList.add("is-invalid");
            valido = false;
        }

        if (!contrasena) {
            if (errorContrasenaReg) errorContrasenaReg.textContent = "Ingresa una contraseña.";
            if (entradaContrasenaReg) entradaContrasenaReg.classList.add("is-invalid");
            valido = false;
        } else if (contrasena.length < 8) {
            if (errorContrasenaReg) errorContrasenaReg.textContent = "La contraseña debe tener al menos 8 caracteres.";
            if (entradaContrasenaReg) entradaContrasenaReg.classList.add("is-invalid");
            valido = false;
        }

        if (terminosReg && !terminosReg.checked) {
            mostrarToast("Debes aceptar los términos y políticas para registrarte.");
            valido = false;
        }

        if (valido && botonRegistro) {
            const textoOriginal = botonRegistro.querySelector(".texto-boton");
            if (textoOriginal) textoOriginal.textContent = "Creando cuenta en BD...";
            botonRegistro.disabled = true;

            // 1. Conexión real a Supabase
            // Como la función principal no es async, usamos una función autoejecutable
            (async () => {
                try {
                    const { data, error } = await supabase
                        .from('usuarios')
                        .insert([
                            { 
                                nombre: nombre, 
                                email: correo, 
                                password_hash: contrasena // Recuerda que en V2 esto lo encriptaremos
                            }
                        ]);

                    if (error) {
                        // Si el correo ya existe, Supabase nos avisará
                        mostrarToast("Error: " + error.message);
                        if (textoOriginal) textoOriginal.textContent = "Crear cuenta gratis";
                        botonRegistro.disabled = false;
                        return;
                    }

                    // 2. Éxito: Mostrar mensaje y cambiar vista
                    mostrarToast("¡Cuenta guardada en Supabase con éxito!");
                    window.setTimeout(() => {
                        cambiarVista("login");
                        if (textoOriginal) textoOriginal.textContent = "Crear cuenta gratis";
                        botonRegistro.disabled = false;
                        formRegistro.reset(); // Limpiamos el formulario
                    }, 1500);

                } catch (err) {
                    mostrarToast("Error de conexión con la base de datos.");
                    botonRegistro.disabled = false;
                }
            })();
        }
    });
}

[entradaCorreoLogin, entradaContrasenaLogin, entradaNombreReg, entradaCorreoReg, entradaContrasenaReg].forEach(inp => {
    if (inp) {
        inp.addEventListener("input", () => {
            inp.classList.remove("is-invalid");
        });
    }
});

(function () {
    const canvas = document.getElementById("networkCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
        x: width * 0.5,
        y: height * 0.5,
        targetX: width * 0.5,
        targetY: height * 0.5,
        radius: 200,
        active: false
    };

    window.addEventListener("mousemove", (e) => {
        mouse.targetX = e.clientX;
        mouse.targetY = e.clientY;
        mouse.active = true;
    });

    window.addEventListener("mouseleave", () => {
        mouse.active = false;
    });

    window.addEventListener("resize", () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initNodes();
    });

    const colorsLeft = [
        { r: 37, g: 99, b: 235 },
        { r: 6, g: 182, b: 212 },
        { r: 99, g: 102, b: 241 }
    ];

    const colorsRight = [
        { r: 255, g: 255, b: 255 },
        { r: 165, g: 243, b: 252 },
        { r: 199, g: 210, b: 254 }
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
            return palette[Math.floor(Math.abs(Math.sin(this.phase * 2)) * palette.length) % palette.length];
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
                    const force = (1 - dist / mouse.radius);
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

        draw(ctx) {
            const color = this.getColor();
            const { r, g, b } = color;
            const currentRadius = this.radius * (1 + Math.sin(this.phase) * 0.2) + this.hoverFactor * 2.0;
            const haloOpacity = (this.x > width * 0.48 ? 0.35 : 0.22) + Math.sin(this.phase) * 0.08 + this.hoverFactor * 0.22;

            const grad = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, currentRadius * 4.5
            );
            grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${haloOpacity})`);
            grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius * 4.5, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
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
                    const isRightSide = ((nodes[i].x + nodes[j].x) / 2) > width * 0.48;
                    const baseAlpha = isRightSide ? 0.32 : 0.22;
                    const alpha = (1 - dist / maxDist) * baseAlpha + (nodes[i].hoverFactor + nodes[j].hoverFactor) * 0.16;

                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);

                    const c1 = nodes[i].getColor();
                    const c2 = nodes[j].getColor();

                    const grad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
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

        requestAnimationFrame(animate);
    }

    animate();
})();
