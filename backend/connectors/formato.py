"""Formato de lo que sale de Capacita: correo, Telegram, documentos de Drive y calendario.

La IA puede dar estructura con un formato mínimo (títulos «## », **negrita**, viñetas «- », listas
«1. », frases destacadas «> » y tablas «| a | b |»). Aquí se interpreta SIN confiar en él: todo el
texto se escapa primero y solo se agregan etiquetas propias, así que nunca pasa HTML, enlaces ni
estilos que vengan del contenido (lo escriba la persona, la IA u otro paso).

El estilo depende de lo que es el contenido, no es uno genérico para todo: académico (sobrio, letra
con serifa y sin colores), formal (informe, factura, reunión), promocional (cálido, con tarjetas
por sección) o general (la identidad de Capacita).
"""
import html
import re

TITULO = re.compile(r"^(#{1,6})\s+(.+?)\s*#*$")
VINETA = re.compile(r"^[-*•]\s+(.*)$")
NUMERO = re.compile(r"^(\d{1,3})[.)]\s+(.*)$")
CITA = re.compile(r"^>\s?(.*)$")
FILA = re.compile(r"^\|.*\|$")
SEPARADOR = re.compile(r"^\|?(\s*:?-{3,}:?\s*\|)+\s*(:?-{3,}:?\s*)?\|?$")
REGLA = re.compile(r"^(-{3,}|\*{3,}|_{3,}|—{2,})$")
NEGRITA = re.compile(r"\*\*(?=\S)(.+?)(?<=\S)\*\*")
CURSIVA = re.compile(r"(?<![\w*])\*(?=[^\s*])([^*\n]+?)(?<=[^\s*])\*(?![\w*])")


# ---------- Lectura ----------

def _celdas(linea):
    return [celda.strip() for celda in linea.strip().strip("|").split("|")]


def _especial(linea):
    return bool(TITULO.match(linea) or FILA.match(linea) or CITA.match(linea) or VINETA.match(linea)
                or NUMERO.match(linea) or REGLA.match(linea))


def bloques(texto):
    """El texto en bloques: (tipo, datos). Tipos: titulo (nivel, texto), parrafo [líneas], lista
    [ítems], numerada [ítems], cita [líneas], tabla (encabezado o None, filas) y regla."""
    lineas = [linea.strip() for linea in str(texto or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    salida, i = [], 0
    while i < len(lineas):
        limpia = lineas[i]
        if not limpia:
            i += 1
        elif m := TITULO.match(limpia):
            salida.append(("titulo", (min(len(m.group(1)), 3), m.group(2).strip().strip("*").strip())))
            i += 1
        elif REGLA.match(limpia):
            salida.append(("regla", None))
            i += 1
        elif FILA.match(limpia):
            filas = []
            while i < len(lineas) and FILA.match(lineas[i]):
                filas.append(lineas[i])
                i += 1
            encabezado = None
            if len(filas) > 1 and SEPARADOR.match(filas[1]):
                encabezado, filas = _celdas(filas[0]), filas[2:]
            salida.append(("tabla", (encabezado, [_celdas(fila) for fila in filas if not SEPARADOR.match(fila)])))
        elif CITA.match(limpia):
            citas = []
            while i < len(lineas) and CITA.match(lineas[i]):
                citas.append(CITA.match(lineas[i]).group(1).strip())
                i += 1
            salida.append(("cita", [c for c in citas if c] or [""]))
        elif VINETA.match(limpia) or NUMERO.match(limpia):
            patron, tipo = (VINETA, "lista") if VINETA.match(limpia) else (NUMERO, "numerada")
            items = []
            while i < len(lineas) and lineas[i] and patron.match(lineas[i]):
                items.append(patron.match(lineas[i]).groups()[-1].strip())
                i += 1
            salida.append((tipo, items))
        else:
            parrafo = []
            while i < len(lineas) and lineas[i] and not (parrafo and _especial(lineas[i])):
                parrafo.append(lineas[i])
                i += 1
            # «Lunes 24:» justo antes de una lista es un subtítulo, aunque no lleve «###».
            siguiente = lineas[i] if i < len(lineas) else ""
            if (len(parrafo) == 1 and parrafo[0].endswith(":") and len(parrafo[0]) <= 70
                    and (VINETA.match(siguiente) or NUMERO.match(siguiente))):
                salida.append(("titulo", (3, parrafo[0][:-1].strip().strip("*").strip())))
            else:
                salida.append(("parrafo", parrafo))
    return salida


def en_linea(texto, negrita=("<b>", "</b>"), cursiva=("<i>", "</i>")):
    """Escapa TODO y después aplica solo negrita y cursiva propias."""
    seguro = html.escape(texto, quote=False)
    seguro = NEGRITA.sub(lambda m: negrita[0] + m.group(1) + negrita[1], seguro)
    return CURSIVA.sub(lambda m: cursiva[0] + m.group(1) + cursiva[1], seguro)


def sin_marcas(texto):
    return CURSIVA.sub(r"\1", NEGRITA.sub(r"\1", texto))


# ---------- Estilo según el contenido ----------

CLAVES = {
    "academico": ("apa", "referencia", "bibliograf", "doi", "et al", "investigaci", "tesis", "científic",
                  "revista", "metodolog", "hipótesis", "universidad", "ensayo", "monograf", "académic",
                  "marco teórico", "estado del arte", "autores", "abstract", "artículo", "estudiante",
                  "docente", "asignatura", "parcial"),
    "promocional": ("promo", "oferta", "descuento", "2x1", "3x2", "clientes", "domicilio", "combo", "gratis",
                    "lanzamiento", "menú", "aprovecha", "precio especial", "bebidas", "restaurante",
                    "tienda", "redes sociales", "instagram", "anuncio", "¡"),
    "formal": ("informe", "reporte", "factura", "proveedor", "reunión", "acta", "cotizaci", "presupuesto",
               "contrato", "nit", "pago", "inventario", "balance", "trm", "indicador", "cuenta de cobro",
               "estimad", "cordialmente", "atentamente", "solicitud", "empresa"),
}
ESTILOS = {"académico": "academico", "academico": "academico", "formal": "formal",
           "promocional": "promocional", "sencillo": "general", "general": "general"}


def elegir_estilo(asunto, texto, pedido=None):
    """El estilo pedido explícitamente o el que corresponde al contenido (el asunto pesa doble)."""
    elegido = ESTILOS.get(str(pedido or "").strip().lower())
    if elegido:
        return elegido
    titulo, cuerpo = str(asunto or "").lower(), str(texto or "").lower()
    puntajes = {estilo: sum(2 * (clave in titulo) + (clave in cuerpo) for clave in claves)
                for estilo, claves in CLAVES.items()}
    # Ante empate gana el más específico: lo académico nunca debe salir con colores de promoción.
    mejor = max(("academico", "promocional", "formal"), key=lambda estilo: puntajes[estilo])
    return mejor if puntajes[mejor] >= 2 else "general"


SANS = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
SERIF = "Georgia,'Times New Roman',Times,serif"
TEMAS = {
    "general": {"fondo": "#eef2ff", "texto": "#0f172a", "suave": "#64748b", "acento": "#4338ca", "borde": "#e2e8f0",
                "fuente": SANS, "titulos": SANS, "cabecera": "#2563eb",
                "degradado": "linear-gradient(135deg,#2563eb 0%,#4f46e5 55%,#06b6d4 100%)",
                "cita_fondo": "#eef2ff", "cita_borde": "#6366f1", "tabla": "#eef2ff", "tarjetas": False, "cebra": False},
    "promocional": {"fondo": "#fff7ed", "texto": "#1c1917", "suave": "#78716c", "acento": "#c2410c", "borde": "#fed7aa",
                    "fuente": SANS, "titulos": SANS, "cabecera": "#ea580c",
                    "degradado": "linear-gradient(135deg,#f97316 0%,#ef4444 55%,#ec4899 100%)",
                    "cita_fondo": "#ffedd5", "cita_borde": "#f97316", "tabla": "#ffedd5", "tarjetas": True, "cebra": False},
    "formal": {"fondo": "#f1f5f9", "texto": "#0f172a", "suave": "#64748b", "acento": "#1e3a8a", "borde": "#cbd5e1",
               "fuente": SANS, "titulos": SANS, "cabecera": "#1e293b", "degradado": None,
               "cita_fondo": "#f8fafc", "cita_borde": "#1e3a8a", "tabla": "#e2e8f0", "tarjetas": False, "cebra": True},
    "academico": {"fondo": "#ffffff", "texto": "#111111", "suave": "#555555", "acento": "#111111", "borde": "#d4d4d4",
                  "fuente": SERIF, "titulos": SERIF, "cabecera": None, "degradado": None,
                  "cita_fondo": None, "cita_borde": "#9ca3af", "tabla": None, "tarjetas": False, "cebra": False},
}


# ---------- Correo (HTML con estilos en línea, como exigen los programas de correo) ----------

def _bloque_html(tipo, datos, t, academico):
    negrita = ("<strong>", "</strong>") if academico else (f'<strong style="color:{t["acento"]}">', "</strong>")

    def linea(texto):
        return en_linea(texto, negrita, ("<em>", "</em>"))

    if tipo == "titulo":
        nivel, texto = datos
        color = t["texto"] if academico else t["acento"]
        return (f'<h{max(2, nivel)} style="margin:22px 0 10px;font-family:{t["titulos"]};font-size:{ {1: 20, 2: 18, 3: 16}[nivel]}px;'
                f'line-height:1.3;color:{color};font-weight:700">{linea(texto)}</h{max(2, nivel)}>')
    if tipo == "parrafo":
        return f'<p style="margin:0 0 12px;line-height:1.6">{"<br>".join(linea(x) for x in datos)}</p>'
    if tipo in ("lista", "numerada"):
        etiqueta = "ul" if tipo == "lista" else "ol"
        items = "".join(f'<li style="margin:0 0 6px">{linea(x)}</li>' for x in datos)
        return f'<{etiqueta} style="margin:0 0 14px;padding-left:22px;line-height:1.6">{items}</{etiqueta}>'
    if tipo == "cita":
        contenido = "<br>".join(linea(x) for x in datos)
        if academico:
            return (f'<blockquote style="margin:0 0 14px;padding:2px 0 2px 16px;border-left:2px solid {t["cita_borde"]};'
                    f'color:#333333;font-style:italic;line-height:1.6">{contenido}</blockquote>')
        return (f'<div style="margin:0 0 14px;padding:14px 16px;background:{t["cita_fondo"]};border-left:4px solid '
                f'{t["cita_borde"]};border-radius:10px;font-size:16px;font-weight:600;line-height:1.5">{contenido}</div>')
    if tipo == "tabla":
        encabezado, filas = datos
        celda = "padding:8px 10px;text-align:left;vertical-align:top"
        cabeza = ""
        if encabezado:
            fondo = f"background:{t['tabla']};" if t["tabla"] else ""
            raya = "#111111" if academico else t["borde"]
            cabeza = "<tr>" + "".join(f'<th style="{celda};{fondo}border-bottom:2px solid {raya};font-weight:700">'
                                      f"{linea(x)}</th>" for x in encabezado) + "</tr>"
        cuerpo = "".join("<tr>" + "".join(
            f'<td style="{celda};border-bottom:1px solid {t["borde"]};{"background:#f8fafc;" if t["cebra"] and n % 2 else ""}">'
            f"{linea(x)}</td>" for x in fila) + "</tr>" for n, fila in enumerate(filas))
        return (f'<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;'
                f'margin:0 0 16px;font-size:14px;line-height:1.45">{cabeza}{cuerpo}</table>')
    return f'<hr style="border:0;border-top:1px solid {t["borde"]};margin:18px 0">'


def sin_titulo_repetido(texto, titulo):
    """Los bloques sin el primer título si repite el asunto o el nombre (la IA suele repetirlo)."""
    partes = bloques(texto)
    plano = lambda valor: " ".join(sin_marcas(str(valor)).lower().split())
    if partes and partes[0][0] == "titulo" and plano(partes[0][1][1]) == plano(titulo):
        return partes[1:]
    return partes


def _cuerpo_html(partes, t, academico):
    if not t["tarjetas"] or not any(tipo == "titulo" for tipo, _ in partes):
        return "".join(_bloque_html(tipo, datos, t, academico) for tipo, datos in partes)
    # Promocional: cada sección (un título y lo que sigue) va en su propia tarjeta.
    salida, seccion = [], None

    def cerrar():
        salida.append(f'<div style="margin:0 0 14px;padding:4px 18px 6px;background:#ffffff;border:1px solid {t["borde"]};'
                      f'border-left:5px solid {t["cabecera"]};border-radius:14px">{"".join(seccion)}</div>')

    for tipo, datos in partes:
        if tipo == "titulo":
            if seccion is not None:
                cerrar()
            seccion = [_bloque_html(tipo, datos, t, academico).replace("margin:22px 0 10px", "margin:14px 0 8px", 1)]
        elif seccion is not None:
            seccion.append(_bloque_html(tipo, datos, t, academico))
        else:
            salida.append(_bloque_html(tipo, datos, t, academico))
    if seccion is not None:
        cerrar()
    return "".join(salida)


def correo_html(asunto, texto, *, estilo="general", adjunto=False, remitente=None):
    """Correo completo. remitente=None: va a la propia persona (lleva la marca Capacita);
    con remitente: va a otra persona en su nombre (sin cabecera de marca, pie discreto)."""
    t, academico = TEMAS[estilo], estilo == "academico"
    if remitente is None and t["cabecera"]:
        fondo = f'background:{t["cabecera"]};' + (f'background-image:{t["degradado"]};' if t["degradado"] else "")
        cabecera = (f'<tr><td style="{fondo}padding:16px 26px;color:#ffffff;font-family:{SANS};font-size:16px;'
                    'font-weight:700;letter-spacing:.3px"><span style="opacity:.8;letter-spacing:1px">●─●─●</span>'
                    '&nbsp;&nbsp;Capacita</td></tr>')
    elif remitente is None:  # académico: solo una línea discreta, sin color
        cabecera = (f'<tr><td style="padding:18px 30px 0;color:{t["suave"]};font-family:{SANS};font-size:11px;'
                    'letter-spacing:2px;text-transform:uppercase">Capacita</td></tr>')
    elif academico:
        cabecera = ""
    else:
        cabecera = f'<tr><td style="height:5px;line-height:5px;font-size:0;background:{t["cabecera"]}">&nbsp;</td></tr>'
    nota = (f'<p style="margin:16px 0 0;padding:10px 14px;border:1px solid {t["borde"]};border-radius:10px;'
            f'color:{t["suave"]};font-size:13px">Va adjunto el archivo.</p>') if adjunto else ""
    pie = ("Te lo envió Capacita a tu propio correo porque lo aprobaste en un proceso." if remitente is None
           else f"Enviado por {html.escape(remitente)} con Capacita.")
    raya_titulo = f'border-bottom:1px solid {t["borde"]};padding-bottom:12px;' if academico else ""
    return ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
            f'</head><body style="margin:0;background:{t["fondo"]};font-family:{t["fuente"]};color:{t["texto"]}">'
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;'
            f'border:1px solid {t["borde"]};border-radius:{"0" if academico else "16px"};overflow:hidden">'
            f'{cabecera}<tr><td style="padding:26px 30px;font-family:{t["fuente"]};font-size:15px;color:{t["texto"]}">'
            f'<h1 style="margin:0 0 18px;{raya_titulo}font-family:{t["titulos"]};font-size:22px;line-height:1.3;'
            f'color:{t["texto"]}">{html.escape(asunto)}</h1>{_cuerpo_html(sin_titulo_repetido(texto, asunto), t, academico)}{nota}</td></tr>'
            f'<tr><td style="padding:14px 30px;border-top:1px solid {t["borde"]};color:{t["suave"]};font-family:{SANS};'
            f'font-size:12px">{pie}</td></tr></table></td></tr></table></body></html>')


# ---------- Texto plano (alternativa del correo, calendario) ----------

def _filas_tabla(datos, celda, cabeza=lambda x: x, prefijo=""):
    encabezado, filas = datos
    return "\n".join(([cabeza(" · ".join(celda(c) for c in encabezado))] if encabezado else [])
                     + [prefijo + " · ".join(celda(c) for c in fila) for fila in filas])


def texto_plano(texto):
    partes = []
    for tipo, datos in bloques(texto):
        if tipo == "titulo":
            partes.append(sin_marcas(datos[1]).upper() if datos[0] <= 2 else sin_marcas(datos[1]))
        elif tipo == "parrafo":
            partes.append("\n".join(sin_marcas(x) for x in datos))
        elif tipo == "lista":
            partes.append("\n".join("• " + sin_marcas(x) for x in datos))
        elif tipo == "numerada":
            partes.append("\n".join(f"{n}. {sin_marcas(x)}" for n, x in enumerate(datos, 1)))
        elif tipo == "cita":
            partes.append("\n".join("  » " + sin_marcas(x) for x in datos))
        elif tipo == "tabla":
            partes.append(_filas_tabla(datos, sin_marcas))
        else:
            partes.append("———")
    return "\n\n".join(partes)


# ---------- Telegram (HTML limitado: b, i, blockquote) ----------

def telegram_html(texto):
    partes = []
    for tipo, datos in bloques(texto):
        if tipo == "titulo":
            partes.append(f"<b>{en_linea(datos[1])}</b>")
        elif tipo == "parrafo":
            partes.append("\n".join(en_linea(x) for x in datos))
        elif tipo == "lista":
            partes.append("\n".join("• " + en_linea(x) for x in datos))
        elif tipo == "numerada":
            partes.append("\n".join(f"{n}. {en_linea(x)}" for n, x in enumerate(datos, 1)))
        elif tipo == "cita":
            partes.append("<blockquote>" + "\n".join(en_linea(x) for x in datos) + "</blockquote>")
        elif tipo == "tabla":
            partes.append(_filas_tabla(datos, en_linea, lambda x: f"<b>{x}</b>", "• "))
        else:
            partes.append("———")
    return "\n\n".join(partes)


def trozos(texto, maximo):
    """Parte un texto largo en trozos de hasta `maximo` caracteres sin cortar una línea (salvo que
    la línea sola sea más larga): así cada trozo conserva sus marcas y su HTML queda bien cerrado."""
    salida, actual = [], ""
    for linea in str(texto).split("\n"):
        while len(linea) > maximo:
            if actual:
                salida.append(actual)
                actual = ""
            salida.append(linea[:maximo])
            linea = linea[maximo:]
        candidato = f"{actual}\n{linea}" if actual else linea
        if len(candidato) > maximo:
            salida.append(actual)
            actual = linea
        else:
            actual = candidato
    salida.append(actual)
    return [trozo for trozo in salida if trozo.strip()]


# ---------- Documento de Google Docs (Drive convierte el HTML a un documento con estilos) ----------

def documento_html(nombre, texto, estilo="general"):
    t, academico = TEMAS[estilo], estilo == "academico"
    color = t["texto"] if academico else t["acento"]
    partes = []
    for tipo, datos in sin_titulo_repetido(texto, nombre):
        if tipo == "titulo":
            nivel, contenido = datos
            partes.append(f'<h{max(2, nivel)} style="font-family:{t["titulos"]};color:{color}">{en_linea(contenido)}</h{max(2, nivel)}>')
        elif tipo == "parrafo":
            partes.append(f'<p style="line-height:1.5">{"<br>".join(en_linea(x) for x in datos)}</p>')
        elif tipo in ("lista", "numerada"):
            etiqueta = "ul" if tipo == "lista" else "ol"
            partes.append(f"<{etiqueta}>" + "".join(f"<li>{en_linea(x)}</li>" for x in datos) + f"</{etiqueta}>")
        elif tipo == "cita":
            estilo_cita = ("margin-left:36pt;font-style:italic;color:#333333" if academico
                           else f"margin-left:18pt;font-weight:bold;color:{t['acento']}")
            partes.append(f'<p style="{estilo_cita}">{"<br>".join(en_linea(x) for x in datos)}</p>')
        elif tipo == "tabla":
            encabezado, filas = datos
            borde = "border:1px solid #999999;padding:4pt 6pt"
            fondo = f"background:{t['tabla']};" if t["tabla"] else ""
            cabeza = ("<tr>" + "".join(f'<th style="{borde};{fondo}">{en_linea(c)}</th>' for c in encabezado) + "</tr>"
                      if encabezado else "")
            cuerpo = "".join("<tr>" + "".join(f'<td style="{borde}">{en_linea(c)}</td>' for c in fila) + "</tr>"
                             for fila in filas)
            partes.append(f'<table style="border-collapse:collapse">{cabeza}{cuerpo}</table>')
        else:
            partes.append("<hr>")
    return (f'<html><head><meta charset="utf-8"><title>{html.escape(nombre)}</title></head>'
            f'<body style="font-family:{t["fuente"]};font-size:11pt;color:{t["texto"]}">'
            f'<h1 style="font-family:{t["titulos"]};color:{t["texto"]}">{html.escape(nombre)}</h1>{"".join(partes)}</body></html>')
