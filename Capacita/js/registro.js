"use strict";

const vistaLogin = document.getElementById("vistaLogin");
const vistaRegistro = document.getElementById("vistaRegistro");
const enlaceIrRegistro = document.getElementById("enlaceIrRegistro");
const enlaceIrLogin = document.getElementById("enlaceIrLogin");
const subtituloHero = document.getElementById("subtituloHero");

const textoHeroLogin = "Conecta, comparte y accede a las habilidades que necesitas, sin importar tu profesión o experiencia.";
const textoHeroRegistro = "Únete a la red donde tus habilidades se transforman en soluciones. Comparte tu conocimiento y accede al talento de otros profesionales.";

function mostrarRegistro() {
    if (!vistaLogin || !vistaRegistro) return;
    vistaLogin.classList.remove("vista-activa");
    vistaLogin.classList.add("vista-oculta-izq");
    vistaRegistro.classList.remove("vista-oculta-der");
    vistaRegistro.classList.add("vista-activa");
    if (subtituloHero) subtituloHero.textContent = textoHeroRegistro;
    document.title = "Registro — Capacita";
    history.pushState(null, "", "registro.html");
}

function mostrarLogin() {
    if (!vistaLogin || !vistaRegistro) return;
    vistaRegistro.classList.remove("vista-activa");
    vistaRegistro.classList.add("vista-oculta-der");
    vistaLogin.classList.remove("vista-oculta-izq");
    vistaLogin.classList.add("vista-activa");
    if (subtituloHero) subtituloHero.textContent = textoHeroLogin;
    document.title = "Iniciar Sesión — Capacita";
    history.pushState(null, "", "index.html");
}

if (enlaceIrRegistro) {
    enlaceIrRegistro.addEventListener("click", mostrarRegistro);
}

if (enlaceIrLogin) {
    enlaceIrLogin.addEventListener("click", mostrarLogin);
}

window.addEventListener("popstate", () => {
    if (window.location.pathname.includes("registro")) {
        mostrarRegistro();
    } else {
        mostrarLogin();
    }
});

document.querySelectorAll(".boton-toggle-clave").forEach(boton => {
    boton.addEventListener("click", () => {
        const input = boton.parentElement.querySelector("input");
        if (input) {
            input.type = input.type === "password" ? "text" : "password";
        }
    });
});

function mostrarToast(mensaje) {
    const toast = document.getElementById("mensajeToast");
    const texto = document.getElementById("textoToast");
    if (toast && texto) {
        texto.textContent = mensaje;
        toast.classList.add("mostrar");
        setTimeout(() => {
            toast.classList.remove("mostrar");
        }, 3000);
    }
}

document.querySelectorAll(".boton-google-accion").forEach(boton => {
    boton.addEventListener("click", () => {
        mostrarToast("Iniciando conexión con Google...");
    });
});

const formLogin = document.getElementById("formularioInicio");
if (formLogin) {
    formLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        const correo = document.getElementById("correo");
        const contrasena = document.getElementById("contrasena");
        const errorCorreo = document.getElementById("errorCorreo");
        const errorContrasena = document.getElementById("errorContrasena");

        let esValido = true;
        if (errorCorreo) errorCorreo.textContent = "";
        if (errorContrasena) errorContrasena.textContent = "";
        if (correo) correo.classList.remove("is-invalid");
        if (contrasena) contrasena.classList.remove("is-invalid");

        if (!correo || !correo.value.trim()) {
            if (errorCorreo) errorCorreo.textContent = "Por favor, ingresa tu correo.";
            if (correo) correo.classList.add("is-invalid");
            esValido = false;
        } else if (!correo.value.includes("@") || !correo.value.includes(".")) {
            if (errorCorreo) errorCorreo.textContent = "Ingresa un correo electrónico válido.";
            if (correo) correo.classList.add("is-invalid");
            esValido = false;
        }

        if (!contrasena || !contrasena.value) {
            if (errorContrasena) errorContrasena.textContent = "Por favor, ingresa tu contraseña.";
            if (contrasena) contrasena.classList.add("is-invalid");
            esValido = false;
        }

        if (esValido) {
            mostrarToast("Iniciando sesión en Capacita...");
            setTimeout(() => {
                mostrarToast("¡Bienvenido de nuevo!");
            }, 1000);
        }
    });
}

const formRegistro = document.getElementById("formularioRegistro");
if (formRegistro) {
    formRegistro.addEventListener("submit", (e) => {
        e.preventDefault();
        const nombre = document.getElementById("fullname");
        const correo = document.getElementById("emailRegistro");
        const contrasena = document.getElementById("passwordRegistro");
        const terminos = document.getElementById("terms");

        const errorNombre = document.getElementById("errorNombre");
        const errorCorreo = document.getElementById("errorCorreoRegistro");
        const errorContrasena = document.getElementById("errorContrasenaRegistro");

        let esValido = true;
        if (errorNombre) errorNombre.textContent = "";
        if (errorCorreo) errorCorreo.textContent = "";
        if (errorContrasena) errorContrasena.textContent = "";
        if (nombre) nombre.classList.remove("is-invalid");
        if (correo) correo.classList.remove("is-invalid");
        if (contrasena) contrasena.classList.remove("is-invalid");

        if (!nombre || !nombre.value.trim()) {
            if (errorNombre) errorNombre.textContent = "Ingresa tu nombre completo.";
            if (nombre) nombre.classList.add("is-invalid");
            esValido = false;
        }

        if (!correo || !correo.value.trim()) {
            if (errorCorreo) errorCorreo.textContent = "Ingresa un correo electrónico.";
            if (correo) correo.classList.add("is-invalid");
            esValido = false;
        } else if (!correo.value.includes("@") || !correo.value.includes(".")) {
            if (errorCorreo) errorCorreo.textContent = "El formato de correo no es válido.";
            if (correo) correo.classList.add("is-invalid");
            esValido = false;
        }

        if (!contrasena || contrasena.value.length < 8) {
            if (errorContrasena) errorContrasena.textContent = "La contraseña debe tener mínimo 8 caracteres.";
            if (contrasena) contrasena.classList.add("is-invalid");
            esValido = false;
        }

        if (terminos && !terminos.checked) {
            mostrarToast("Debes aceptar los términos y condiciones.");
            esValido = false;
        }

        if (esValido) {
            mostrarToast("Cuenta creada exitosamente. Redirigiendo...");
            setTimeout(() => {
                mostrarLogin();
            }, 1200);
        }
    });
}

const canvas = document.getElementById("networkCanvas");
if (canvas) {
    const ctx = canvas.getContext("2d");
    let ancho = (canvas.width = window.innerWidth);
    let alto = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
        ancho = canvas.width = window.innerWidth;
        alto = canvas.height = window.innerHeight;
    });

    const mouse = { x: null, y: null };
    window.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener("mouseleave", () => {
        mouse.x = null;
        mouse.y = null;
    });

    const particulas = [];
    const totalParticulas = 50;

    for (let i = 0; i < totalParticulas; i++) {
        particulas.push({
            x: Math.random() * ancho,
            y: Math.random() * alto,
            vx: (Math.random() - 0.5) * 1,
            vy: (Math.random() - 0.5) * 1,
            radio: Math.random() * 2 + 2
        });
    }

    function animarRed() {
        ctx.clearRect(0, 0, ancho, alto);

        for (let i = 0; i < particulas.length; i++) {
            const p = particulas[i];

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > ancho) p.vx *= -1;
            if (p.y < 0 || p.y > alto) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(37, 99, 235, 0.7)";
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

        requestAnimationFrame(animarRed);
    }

    animarRed();
}
