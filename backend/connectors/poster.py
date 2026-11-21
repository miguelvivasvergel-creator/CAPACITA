"""Póster promocional profesional: conector revisado, sin red ni IA (el diseño es determinista).

La IA (o la persona) pone las palabras; aquí se aplican siempre las mismas reglas de diseño de
marketing, para que el resultado salga profesional y no varíe:
- jerarquía visual: producto (héroe) → oferta en un sello grande → titular → llamada a la acción → logo;
- regla de los 3 segundos (pocos textos, cortos), máximo 2 tipografías, márgenes de seguridad del 6–7 %;
- colores 60-30-10 sacados del LOGO (o del tipo de negocio) y texto blanco/oscuro según el contraste;
- el texto nunca va encima del producto y se achica o parte en líneas si no cabe.
El logo y la foto pierden su fondo (relleno desde los bordes, que respeta los blancos internos del
logo); si el fondo es complejo la foto va enmarcada, nunca rota. Salen DOS versiones de diseño.
Las imágenes se procesan aquí, en memoria; no viajan a ningún servicio (hosts vacío).
"""
import base64
import binascii
import colorsys
import io
import math
import os
import re
from collections import Counter

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

from connectors.base import Connector, ConnectorInputError

MAX_B64 = 6_000_000            # ~4,5 MB de imagen (la web y Telegram ya las reducen)
MAX_PIXELES = 40_000_000       # imágenes gigantes o «bombas» de descompresión se rechazan
FORMATOS = {"cuadrado": (1080, 1080), "historia": (1080, 1920)}
FIRMAS_IMAGEN = (b"\xff\xd8\xff", b"\x89PNG")

# Paletas (fondo arriba, fondo abajo, acento del sello y del botón, texto sobre el acento).
ESTILOS = {
    "fresco": ("#00C6FB", "#0052D4", "#FFE45C", "#0B1F3A"),
    "vibrante": ("#FF5F6D", "#B3125A", "#FFE66D", "#3A0B1F"),
    "elegante": ("#2E2E38", "#0B0B10", "#D9B44A", "#14110A"),
    "natural": ("#5DB33A", "#1D5530", "#FFF3B0", "#1E3A12"),
    "calido": ("#FF9A2E", "#C2410C", "#FFF4D6", "#6B2600"),
}
# El estilo según el negocio cuando no hay logo del que sacar los colores.
PISTAS = [("fresco", r"helad|fr[ií]o|bebida|jug|agua|smoothie|granizad|piscina|playa|refresc|paleta|yogur"),
          ("calido", r"caf[eé]|pan|pizza|asad|parrilla|horno|hamburgues|arepa|empanad|postre|torta|chocolate"),
          ("elegante", r"spa|belleza|joyer|moda|boutique|vino|perfum|barber|u[ñn]as|est[eé]tica|lujo"),
          ("natural", r"org[aá]nic|natural|verde|planta|vegan|salud|fruta|verdura|granja|vivero|eco")]

FUENTES = {  # Windows (el trabajador de la demo) y Linux; si no hay ninguna, la de Pillow con tamaño.
    "negra": ["seguibl.ttf", "ariblk.ttf", "DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"],
    "negrita": ["segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"],
    "normal": ["segoeui.ttf", "arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"],
}
CARPETAS = [os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts"), "/usr/share/fonts/truetype/dejavu",
            "/usr/share/fonts/truetype/liberation", "/usr/share/fonts/TTF", "/Library/Fonts"]
_fuentes = {}


def fuente(tipo, tam):
    clave = (tipo, tam)
    if clave not in _fuentes:
        rutas = [os.path.join(c, n) for n in FUENTES[tipo] for c in CARPETAS]
        ruta = next((r for r in rutas if os.path.isfile(r)), None)
        _fuentes[clave] = ImageFont.truetype(ruta, tam) if ruta else ImageFont.load_default(size=tam)
    return _fuentes[clave]


# ---------- Textos ----------

def limpio(valor, maximo):
    """Texto apto para el póster: sin markdown ni emojis (las fuentes los dibujan como cuadros), una
    sola línea y cortado en una palabra. Si viene un párrafo de la IA, se queda la primera frase."""
    texto = str(valor or "")
    texto = re.sub(r"[*_`]+|^\s*#+\s+|^\s*>\s*|^\s*[-•]\s+", " ", texto, flags=re.M)
    texto = "".join(c for c in texto if ord(c) < 0x2000 or c in "€•–—“”‘’…")
    texto = " ".join(texto.split())
    if len(texto) > maximo:
        frase = re.split(r"(?<=[.!?])\s", texto)[0]
        texto = frase if 0 < len(frase) <= maximo else texto[:maximo].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return texto.strip()


def envolver(texto, letra, ancho):
    lineas, actual = [], ""
    for palabra in texto.split():
        prueba = f"{actual} {palabra}".strip()
        if letra.getlength(prueba) <= ancho or not actual:
            actual = prueba
        else:
            lineas.append(actual)
            actual = palabra
    return lineas + ([actual] if actual else [])


def encajar(texto, tipo, ancho, max_lineas, grande, chico):
    """(fuente, líneas) con el tamaño más grande que cabe; nunca se sale del ancho ni de las líneas."""
    for tam in range(grande, chico - 1, -2):
        letra = fuente(tipo, tam)
        lineas = envolver(texto, letra, ancho)
        if len(lineas) <= max_lineas and all(letra.getlength(linea) <= ancho for linea in lineas):
            return letra, lineas
    letra = fuente(tipo, chico)
    todas = envolver(texto, letra, ancho)
    lineas = todas[:max_lineas]
    if len(todas) > max_lineas and lineas:
        while " " in lineas[-1] and letra.getlength(lineas[-1] + "…") > ancho:
            lineas[-1] = lineas[-1].rsplit(" ", 1)[0]
        lineas[-1] += "…"
    return letra, lineas


def alto_linea(letra):
    caja = letra.getbbox("ÁÉgjpqy")
    return int((caja[3] - caja[1]) * 1.12)


def escribir(lienzo, lineas, letra, x, y, color, centrado=False, ancho=0, sombra=True):
    """Dibuja las líneas con una sombra suave (legibles sobre cualquier degradado); devuelve el y final."""
    paso = alto_linea(letra)
    posiciones = [(x + (ancho - letra.getlength(linea)) / 2 if centrado else x, y + n * paso, linea)
                  for n, linea in enumerate(lineas)]
    if sombra:
        capa = Image.new("RGBA", lienzo.size, (0, 0, 0, 0))
        trazo = ImageDraw.Draw(capa)
        for dx, dy, linea in posiciones:
            trazo.text((dx, dy + 5), linea, font=letra, fill=(0, 0, 0, 95))
        lienzo.alpha_composite(capa.filter(ImageFilter.GaussianBlur(6)))
    trazo = ImageDraw.Draw(lienzo)
    for dx, dy, linea in posiciones:
        trazo.text((dx, dy), linea, font=letra, fill=color)
    return y + paso * len(lineas)


# ---------- Colores ----------

def pixeles(imagen):
    """Los píxeles en orden (getdata desaparece en Pillow 14; get_flattened_data la reemplaza)."""
    return getattr(imagen, "get_flattened_data", imagen.getdata)()



def rgb(hexa):
    hexa = hexa.lstrip("#")
    return tuple(int(hexa[i:i + 2], 16) for i in (0, 2, 4))


def luminancia(color):
    lineal = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in (v / 255 for v in color[:3])]
    return 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2]


def contraste(a, b):
    la, lb = sorted((luminancia(a), luminancia(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def texto_sobre(fondo):
    """Blanco u oscuro, el que más contraste dé (WCAG): el texto siempre se lee."""
    return (255, 255, 255) if contraste(fondo, (255, 255, 255)) >= contraste(fondo, (20, 20, 28)) else (20, 20, 28)


def mezclar(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def color_de_marca(logo):
    """El color dominante «de marca» del logo (saturado, ni casi blanco ni casi negro), o None."""
    chico = logo.copy()
    chico.thumbnail((120, 120))
    cuenta = Counter()
    for r, g, b, a in pixeles(chico.convert("RGBA")):
        if a < 200:
            continue
        _, luz, saturacion = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if saturacion > 0.3 and 0.15 < luz < 0.85:
            cuenta[(r // 24 * 24 + 12, g // 24 * 24 + 12, b // 24 * 24 + 12)] += 1
    return cuenta.most_common(1)[0][0] if sum(cuenta.values()) > 30 else None


def paleta(estilo, logo, textos):
    """(nombre, arriba, abajo, acento, texto_acento). Con logo: colores de la marca (60-30-10)."""
    if estilo != "automatico":
        return (estilo, *map(rgb, ESTILOS[estilo]))
    marca = color_de_marca(logo) if logo is not None else None
    if marca:
        oscuro = mezclar(marca, (8, 8, 16), 0.55)
        candidatos = [rgb("#FFE45C"), (255, 255, 255), rgb("#FF4D6D"), rgb("#00E5A0")]
        acento = max(candidatos, key=lambda c: contraste(c, mezclar(marca, oscuro, 0.5)))
        return ("marca", marca, oscuro, acento, texto_sobre(acento))
    for nombre, patron in PISTAS:
        if re.search(patron, textos, re.I):
            return (nombre, *map(rgb, ESTILOS[nombre]))
    return ("vibrante", *map(rgb, ESTILOS["vibrante"]))


# ---------- Imágenes ----------

def abrir(inputs, campo):
    datos = inputs.get(campo)
    if datos in (None, ""):
        return None
    if not isinstance(datos, str) or len(datos) > MAX_B64:
        raise ConnectorInputError(campo)
    try:
        crudo = base64.b64decode(datos, validate=True)
    except (binascii.Error, ValueError):
        raise ConnectorInputError(campo) from None
    if not crudo.startswith(FIRMAS_IMAGEN):
        raise ConnectorInputError(campo)
    try:
        imagen = Image.open(io.BytesIO(crudo))
        if imagen.width * imagen.height > MAX_PIXELES:
            raise ConnectorInputError(campo)
        imagen = ImageOps.exif_transpose(imagen)
        imagen.thumbnail((1600, 1600))
        return imagen.convert("RGBA")
    except (OSError, ValueError, Image.DecompressionBombError):
        raise ConnectorInputError(campo) from None


def recortar(imagen):
    caja = imagen.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
    return imagen.crop(caja) if caja else imagen


def sin_fondo(imagen, tolerancia=40):
    """(imagen sin fondo, se_quitó). Si ya trae transparencia, se respeta. Si el borde es de un color
    parejo (foto de estudio, logo sobre blanco), se rellena DESDE LOS BORDES: el fondo conectado se
    vuelve transparente y los blancos internos (las letras de un logo) se conservan. Si el fondo es
    complejo o el resultado no tiene sentido (se borró casi todo o nada), se devuelve tal cual."""
    alfa = imagen.getchannel("A")
    if sum(alfa.histogram()[:200]) > 0.03 * imagen.width * imagen.height:
        return recortar(imagen), True
    chica = imagen.convert("RGB")
    chica.thumbnail((420, 420))
    w, h = chica.size
    borde = [(x, y) for x in range(0, w, max(1, w // 60)) for y in (0, h - 1)] + \
            [(x, y) for y in range(0, h, max(1, h // 60)) for x in (0, w - 1)]
    colores = [chica.getpixel(p) for p in borde]
    fondo = tuple(sorted(c[i] for c in colores)[len(colores) // 2] for i in range(3))
    if sum(max(abs(c[i] - fondo[i]) for i in range(3)) <= tolerancia for c in colores) < 0.7 * len(colores):
        return imagen, False
    canales = ImageChops.difference(chica, Image.new("RGB", chica.size, fondo)).split()
    distancia = ImageChops.lighter(ImageChops.lighter(canales[0], canales[1]), canales[2])
    marca = distancia.point(lambda v: 255 if v <= tolerancia else 0)
    for punto in borde:
        if marca.getpixel(punto) == 255:
            ImageDraw.floodfill(marca, punto, 128, thresh=0)
    objeto = marca.point(lambda v: 0 if v == 128 else 255).filter(ImageFilter.MinFilter(3))
    cobertura = sum(objeto.histogram()[128:]) / (w * h)
    if not 0.03 < cobertura < 0.97:
        return imagen, False
    mascara = objeto.resize(imagen.size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.1))
    resultado = imagen.copy()
    resultado.putalpha(ImageChops.multiply(mascara, alfa))
    return recortar(resultado), True


def enmarcar(imagen, lado):
    """Foto con fondo complejo: marco blanco redondeado (se ve intencional, no un recorte fallido)."""
    foto = ImageOps.fit(imagen.convert("RGB"), (lado, lado), Image.LANCZOS).convert("RGBA")
    radio, borde = lado // 9, 14
    mascara = Image.new("L", (lado, lado), 0)
    ImageDraw.Draw(mascara).rounded_rectangle((0, 0, lado - 1, lado - 1), radio, fill=255)
    foto.putalpha(mascara)
    marco = Image.new("RGBA", (lado + 2 * borde, lado + 2 * borde), (0, 0, 0, 0))
    ImageDraw.Draw(marco).rounded_rectangle((0, 0, marco.width - 1, marco.height - 1), radio + borde, fill=(255, 255, 255, 255))
    marco.alpha_composite(foto, (borde, borde))
    return marco


def silueta(objeto, opacidad):
    """La forma del objeto en negro con esa opacidad (para sombras)."""
    sombra = Image.new("RGBA", objeto.size, (0, 0, 0, 0))
    sombra.putalpha(objeto.getchannel("A").point(lambda v: v * opacidad // 255))
    return sombra


def con_sombra(lienzo, objeto, x, y):
    """Sombra de contacto + sombra suave del contorno: el producto «se apoya», no parece pegado."""
    capa = Image.new("RGBA", lienzo.size, (0, 0, 0, 0))
    capa.alpha_composite(silueta(objeto, 110), (x, y + 22))
    ImageDraw.Draw(capa).ellipse((x + objeto.width * 0.12, y + objeto.height - 18,
                                  x + objeto.width * 0.88, y + objeto.height + 26), fill=(0, 0, 0, 90))
    lienzo.alpha_composite(capa.filter(ImageFilter.GaussianBlur(20)))
    lienzo.alpha_composite(objeto, (x, y))


def fondo_degradado(w, h, arriba, abajo):
    vertical = Image.linear_gradient("L").resize((w, h), Image.BICUBIC)
    horizontal = Image.linear_gradient("L").transpose(Image.Transpose.ROTATE_270).resize((w, h), Image.BICUBIC)
    mascara = Image.blend(vertical, horizontal, 0.3)
    lienzo = Image.composite(Image.new("RGBA", (w, h), (*abajo, 255)), Image.new("RGBA", (w, h), (*arriba, 255)), mascara)
    adorno = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    trazo = ImageDraw.Draw(adorno)
    trazo.ellipse((w * 0.55, -w * 0.25, w * 1.35, w * 0.55), fill=(255, 255, 255, 26))
    trazo.ellipse((-w * 0.35, h - w * 0.45, w * 0.35, h + w * 0.25), fill=(255, 255, 255, 18))
    trazo.ellipse((w * 0.62, h * 0.5, w * 1.12, h * 0.5 + w * 0.5), outline=(255, 255, 255, 40), width=6)
    lienzo.alpha_composite(adorno.filter(ImageFilter.GaussianBlur(2)))
    return lienzo


def foco(lienzo, cx, cy, radio):
    """Luz detrás del producto: lo separa del fondo y dirige la mirada (jerarquía visual)."""
    luz = Image.new("L", (radio * 2, radio * 2), 0)
    # El desenfoque se extiende ~2,5 veces su radio: con este margen llega a 0 antes del borde de la capa.
    ImageDraw.Draw(luz).ellipse((radio * 0.62, radio * 0.62, radio * 1.38, radio * 1.38), fill=110)
    capa = Image.new("RGBA", (radio * 2, radio * 2), (255, 255, 255, 0))
    capa.putalpha(luz.filter(ImageFilter.GaussianBlur(radio * 0.18)))
    lienzo.alpha_composite(capa, (int(cx - radio), int(cy - radio)))


def sello(texto, diametro, color, color_texto, giro=-9):
    """Sello tipo «estallido» con la oferta: lo segundo que se ve, en el color de acento (el 10 %)."""
    d = diametro
    capa = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    trazo = ImageDraw.Draw(capa)
    puntas, radio = 22, d / 2 - 6
    puntos = [(d / 2 + (radio if i % 2 == 0 else radio * 0.88) * math.cos(math.pi * i / puntas),
               d / 2 + (radio if i % 2 == 0 else radio * 0.88) * math.sin(math.pi * i / puntas)) for i in range(2 * puntas)]
    trazo.polygon(puntos, fill=(*color, 255))
    margen = d * 0.17
    trazo.ellipse((margen, margen, d - margen, d - margen), outline=(*color_texto, 70), width=max(3, d // 90))
    letra, lineas = encajar(texto.upper(), "negra", int(d * 0.58), 3, int(d * 0.24), int(d * 0.09))
    alto = alto_linea(letra) * len(lineas)
    escribir(capa, lineas, letra, d * 0.21, (d - alto) / 2 - alto_linea(letra) * 0.08, (*color_texto, 255),
             centrado=True, ancho=d * 0.58, sombra=False)
    final = Image.new("RGBA", (d + 40, d + 50), (0, 0, 0, 0))
    sombra = Image.new("RGBA", final.size, (0, 0, 0, 0))
    sombra.alpha_composite(silueta(capa, 110), (20, 32))
    final.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(10)))
    final.alpha_composite(capa, (20, 20))
    return final.rotate(giro, resample=Image.BICUBIC, expand=True)


def boton(texto, letra, color, color_texto, alto):
    ancho = int(letra.getlength(texto) + alto * 1.1)
    capa = Image.new("RGBA", (ancho + 30, alto + 40), (0, 0, 0, 0))
    ImageDraw.Draw(capa).rounded_rectangle((15, 24, ancho + 15, alto + 24), alto // 2, fill=(0, 0, 0, 80))
    capa = capa.filter(ImageFilter.GaussianBlur(7))
    trazo = ImageDraw.Draw(capa)
    trazo.rounded_rectangle((15, 15, ancho + 15, alto + 15), alto // 2, fill=(*color, 255))
    caja = letra.getbbox(texto)
    trazo.text((15 + (ancho - letra.getlength(texto)) / 2, 15 + (alto - (caja[3] + caja[1])) / 2), texto,
               font=letra, fill=(*color_texto, 255))
    return capa


def ajustado(imagen, max_w, max_h):
    escala = min(max_w / imagen.width, max_h / imagen.height)
    return imagen.resize((max(1, int(imagen.width * escala)), max(1, int(imagen.height * escala))), Image.LANCZOS)


# ---------- Composición ----------

def necesita_placa(logo, fondo):
    """¿El logo se perdería sobre ese fondo? (más del 12 % de su dibujo sin contraste suficiente)."""
    chico = logo.copy()
    chico.thumbnail((90, 90))
    visibles = [p for p in pixeles(chico) if p[3] > 160]
    if not visibles:
        return False
    flojos = sum(1 for p in visibles if contraste(p, fondo) < 3.0)  # 3:1, el mínimo para gráficos (WCAG)
    return flojos > 0.05 * len(visibles)


def fondo_claro(imagen):
    """¿La imagen venía sobre un fondo claro? (logo pensado para fondos claros: en uno oscuro va en placa)."""
    if imagen.getchannel("A").getextrema()[0] < 200:
        return False
    chica = imagen.convert("RGB")
    chica.thumbnail((200, 200))
    w, h = chica.size
    borde = [chica.getpixel((x, y)) for x in range(0, w, 5) for y in (0, h - 1)]
    return luminancia(tuple(sorted(c[i] for c in borde)[len(borde) // 2] for i in range(3))) > 0.6


def poner_logo(lienzo, logo, x, y, fondo, era_claro=False):
    if necesita_placa(logo, fondo) or (era_claro and luminancia(fondo) < 0.2):
        placa = Image.new("RGBA", (logo.width + 40, logo.height + 28), (0, 0, 0, 0))
        ImageDraw.Draw(placa).rounded_rectangle((0, 0, placa.width - 1, placa.height - 1), 24, fill=(255, 255, 255, 240))
        lienzo.alpha_composite(placa, (int(x - 20), int(y - 14)))
    lienzo.alpha_composite(logo, (int(x), int(y)))


def mejor_esquina(oferta, objeto, posicion, zona, texto_caja, limite, m):
    """Dónde va el sello: prueba las cuatro esquinas del producto y elige la que MENOS lo tapa, sin
    pisar nunca el texto ni salirse del póster (sirve para un cono, una taza o una botella)."""
    x, y = posicion
    ow, oh = oferta.size
    limite_w, pie = limite
    candidatos = [(x + objeto.width - ow * 0.55, y - oh * 0.25), (x + objeto.width - ow * 0.55, y + objeto.height - oh * 0.75),
                  (x - ow * 0.45, y + objeto.height - oh * 0.75), (x - ow * 0.45, y - oh * 0.25),
                  (zona[2] - ow, zona[1]), (zona[2] - ow, zona[3] - oh)]
    escala = 4  # se mide en pequeño: rápido y suficiente para comparar
    alfa_producto = objeto.getchannel("A").resize((max(1, objeto.width // escala), max(1, objeto.height // escala)))
    alfa_sello = oferta.getchannel("A").resize((max(1, ow // escala), max(1, oh // escala)))
    mejor, menor = None, None
    for cx, cy in candidatos:
        cx = int(min(max(cx, m * 0.2), limite_w - ow - m * 0.2))
        cy = int(min(max(cy, m * 0.2), pie - oh))
        if cx < texto_caja[2] and cy < texto_caja[3] and cx + ow > texto_caja[0]:
            continue  # pisaría el texto
        lienzo = Image.new("L", (limite_w // escala + 2, pie // escala + 2), 0)
        lienzo.paste(alfa_producto, (x // escala, y // escala))
        recorte = lienzo.crop((cx // escala, cy // escala, cx // escala + alfa_sello.width, cy // escala + alfa_sello.height))
        tapado = sum(ImageChops.multiply(recorte, alfa_sello).point(lambda v: 255 if v > 60 else 0).histogram()[255:])
        if menor is None or tapado < menor:
            mejor, menor = (cx, cy), tapado
    total = max(1, sum(alfa_producto.point(lambda v: 255 if v > 60 else 0).histogram()[255:]))
    if mejor is None:
        return (int(limite_w - ow - m * 0.2), int(max(texto_caja[3], pie - oh))), 1.0
    return mejor, menor / total


def componer_poster(w, h, textos, producto, logo, colores, centrado, logo_claro=False):
    """Un póster con ZONAS que no se pisan: marca → texto → héroe (producto + sello) → llamada a la acción.
    centrado=False: dos columnas de anuncio (texto a la izquierda, producto grande a la derecha).
    centrado=True: todo centrado, el producto grande abajo del titular y el sello en su esquina."""
    _, arriba, abajo, acento, texto_acento = colores
    lienzo = fondo_degradado(w, h, arriba, abajo)
    m = int(w * 0.065)
    alto_formato = h > w
    escala = 1.12 if alto_formato else 1.0
    color = texto_sobre(mezclar(arriba, abajo, 0.35))
    dos_columnas = producto is not None and not centrado and not alto_formato  # en formato alto se apila
    ancho_texto = int(w * 0.46) if dos_columnas else w - 2 * m
    ancho_centro = w - 2 * m if centrado else 0
    # Pie reservado: llamada a la acción y contacto (lo último que se lee).
    letra_cta, alto_cta = fuente("negrita", int(40 * escala)), int(92 * escala)
    letra_contacto = fuente("normal", int(28 * escala))
    pie = h - m - alto_cta - ((alto_linea(letra_contacto) + 14) if textos["contacto"] else 0)
    # 1) Marca arriba.
    y = m
    if logo is not None:
        marca = ajustado(logo, w * (0.26 if dos_columnas else 0.3), w * 0.12)
        poner_logo(lienzo, marca, (w - marca.width) // 2 if centrado else m, y, mezclar(arriba, abajo, 0.1), logo_claro)
        y += marca.height + int(34 * escala)
    else:
        letra = fuente("negrita", int(34 * escala))
        nombre = textos["negocio"].upper()
        ImageDraw.Draw(lienzo).text(((w - letra.getlength(nombre)) / 2 if centrado else m, y), nombre,
                                    font=letra, fill=(*color, 235))
        y += alto_linea(letra) + int(28 * escala)
    heroe, tapado, tam_titular = 0.0, 0.0, 0
    # 2) Texto: titular grande y mensaje; en dos columnas hay más líneas porque la columna es angosta.
    lineas_titular = 3 if dos_columnas else 2
    if textos["titular"]:
        grande = int((86 if dos_columnas else 92) * escala) if producto is not None else int(100 * escala)
        letra, lineas = encajar(textos["titular"], "negra", ancho_texto, lineas_titular, grande, int(46 * escala))
        tam_titular = getattr(letra, "size", 0)
        y = escribir(lienzo, lineas, letra, m, y, (*color, 255), centrado, ancho_centro) + int(14 * escala)
    if textos["mensaje"]:
        maximo = 4 if dos_columnas else 2
        letra, lineas = encajar(textos["mensaje"], "normal", ancho_texto, maximo, int(36 * escala), int(24 * escala))
        y = escribir(lienzo, lineas, letra, m, y, (*color, 230), centrado, ancho_centro, sombra=False)
    # 3) Héroe: el producto lo más grande posible en su zona, con luz detrás y sombra; el sello en
    # una esquina del producto, fuera de la zona del texto. Sin foto, el sello grande es el héroe.
    if producto is not None:
        if dos_columnas:
            zona = (int(w * 0.5), m, w - int(m * 0.4), pie - int(24 * escala))
        else:
            zona = (m, y + int(26 * escala), w - m, pie - int(24 * escala))
        diametro = int(w * (0.27 if dos_columnas else 0.32 if alto_formato else 0.25))
        zw, zh = zona[2] - zona[0], zona[3] - zona[1]
        objeto = ajustado(producto, zw * (0.84 if dos_columnas else 0.8 if alto_formato else 0.62), max(80, zh))
        x = zona[0] + (zw - objeto.width) // 2
        ytop = zona[1] + (zh - objeto.height) // 2
        foco(lienzo, x + objeto.width // 2, ytop + objeto.height // 2, int(max(objeto.width, objeto.height) * 0.75))
        con_sombra(lienzo, objeto, x, ytop)
        oferta = sello(textos["oferta"], diametro, acento, texto_acento, giro=-9 if dos_columnas else 8)
        texto_caja = (0, 0, m + ancho_texto, y) if dos_columnas else (0, 0, w, y)
        (sx, sy), tapado = mejor_esquina(oferta, objeto, (x, ytop), zona, texto_caja, (w, pie), m)
        lienzo.alpha_composite(oferta, (sx, sy))
        visible = sum(objeto.getchannel("A").point(lambda v: 255 if v > 60 else 0).histogram()[255:])
        heroe = visible / (w * h)
    else:
        libre = pie - int(30 * escala) - (y + int(30 * escala))
        oferta = sello(textos["oferta"], int(min(w * (0.62 if alto_formato else 0.5), libre * 0.95)), acento,
                       texto_acento, giro=-7)
        lienzo.alpha_composite(oferta, ((w - oferta.width) // 2, int(y + int(30 * escala) + (libre - oferta.height) / 2)))
    # 4) Llamada a la acción y contacto.
    pastilla = boton(textos["llamada_accion"] or "¡Te esperamos!", letra_cta, acento, texto_acento, alto_cta)
    lienzo.alpha_composite(pastilla, ((w - pastilla.width) // 2 if centrado else m - 15, pie - 15))
    if textos["contacto"]:
        letra, lineas = encajar(textos["contacto"], "normal", w - 2 * m, 1, int(28 * escala), int(20 * escala))
        escribir(lienzo, lineas, letra, m, pie + alto_cta + 14, (*color, 235), centrado, ancho_centro, sombra=False)
    # Puntaje del diseño (criterios de marketing): lo que más pesa es que el producto se vea GRANDE (el
    # héroe); que el sello monte un poco sobre él es normal en publicidad, taparlo mucho (más del 20 %) no;
    # y el titular debe leerse grande. Sin producto, lo centrado queda más equilibrado.
    puntaje = (300 * heroe - 40 * tapado - 200 * max(0.0, tapado - 0.2) + 0.15 * tam_titular
               + (1 if centrado and producto is None else 0))
    return lienzo.convert("RGB"), puntaje


def a_base64(imagen):
    salida = io.BytesIO()
    imagen.save(salida, "JPEG", quality=90, optimize=True, progressive=True)
    return base64.b64encode(salida.getvalue()).decode()


def poster(http, inputs, parameters):
    formato, estilo = parameters.get("formato", "cuadrado"), parameters.get("estilo", "automatico")
    if formato not in FORMATOS:
        raise ConnectorInputError("formato")
    if estilo != "automatico" and estilo not in ESTILOS:
        raise ConnectorInputError("estilo")
    textos = {"negocio": limpio(inputs.get("negocio"), 40), "oferta": limpio(inputs.get("oferta"), 40),
              "titular": limpio(inputs.get("titular"), 70), "mensaje": limpio(inputs.get("mensaje"), 130),
              "llamada_accion": limpio(inputs.get("llamada_accion"), 32), "contacto": limpio(inputs.get("contacto"), 70)}
    for campo in ("negocio", "oferta"):
        if not textos[campo]:
            raise ConnectorInputError(campo)
    foto, logo = abrir(inputs, "foto_producto"), abrir(inputs, "logo")
    notas, producto = [], None
    if foto is not None:
        recorte, quitado = sin_fondo(foto)
        producto = recorte if quitado else enmarcar(foto, 760)
        notas.append("le quité el fondo al producto" if quitado else "la foto tenía un fondo complejo y la enmarqué")
    logo_claro = logo is not None and fondo_claro(logo)
    if logo is not None:
        logo, quitado = sin_fondo(logo, tolerancia=48)
        notas.append("limpié el fondo del logo" if quitado else "usé el logo tal cual")
    w, h = FORMATOS[formato]
    colores = paleta(estilo, logo, " ".join(textos.values()))
    # Se arman los dos diseños con los colores de la marca y se entrega SOLO el mejor (la persona recibe
    # un póster bien hecho, no una elección). «poster_alternativo» queda en el contrato publicado.
    disenos = sorted((componer_poster(w, h, textos, producto, logo, colores, centrado=c, logo_claro=logo_claro)
                      for c in (False, True)), key=lambda d: d[1], reverse=True)
    resumen = (f"Tu póster para «{textos['negocio']}» ({textos['oferta']}) está listo"
               + (f": {' y '.join(notas)}." if notas else "."))
    return {"poster": a_base64(disenos[0][0]), "poster_alternativo": a_base64(disenos[1][0]), "resumen": resumen}


TEXTO = {"type": "string"}
IMAGEN_SALIDA = {"type": "string", "contentEncoding": "base64", "contentMediaType": "image/jpeg"}

POSTER = Connector(
    key="poster_promocional", version=1, provider="Capacita (diseño local)", provider_url="https://capacita.local/diseno",
    hosts=[], name="Diseñar un póster promocional",
    description="Conector de diseño (local, sin IA ni internet): crea un póster, afiche o flyer promocional profesional "
                "listo para Instagram, WhatsApp o imprimir, con la foto del producto sin fondo, el logo limpio, la oferta "
                "en un sello grande, el titular y la llamada a la acción, con buenas prácticas de marketing (jerarquía "
                "visual, contraste, colores de la marca). Entrega dos versiones de diseño en JPG.",
    category="imagenes", input_type="imagen", output_type="imagen",
    input_schema={"type": "object", "additionalProperties": False, "required": ["negocio", "oferta"], "properties": {
        "negocio": {**TEXTO, "title": "Negocio", "description": "Nombre del negocio, por ejemplo Frío Rico"},
        "oferta": {**TEXTO, "title": "Oferta", "description": "Lo que va en grande: 2x1 en conos, -20 %, $9.900"},
        "titular": {**TEXTO, "title": "Titular", "description": "Frase principal corta, máximo 6 palabras"},
        "mensaje": {**TEXTO, "title": "Mensaje", "description": "Una frase de apoyo; puede venir de la IA"},
        "llamada_accion": {**TEXTO, "title": "Llamada a la acción", "description": "Por ejemplo: Ven hoy, Pide por WhatsApp"},
        "contacto": {**TEXTO, "title": "Contacto", "description": "WhatsApp, dirección o redes, solo si la persona los dio"},
        "foto_producto": {**TEXTO, "title": "Foto del producto", "contentEncoding": "base64", "contentMediaType": "image/jpeg",
                          "description": "Opcional: se le quita el fondo"},
        "logo": {**TEXTO, "title": "Logo", "contentEncoding": "base64", "contentMediaType": "image/png",
                 "description": "Opcional: se le quita el fondo y se toman sus colores"}}},
    parameter_schema={"type": "object", "additionalProperties": False, "required": ["formato", "estilo"], "properties": {
        "formato": {"type": "string", "title": "Formato", "enum": list(FORMATOS), "default": "cuadrado",
                    "description": "cuadrado 1080×1080 (publicación) o historia 1080×1920 (estados e historias)"},
        "estilo": {"type": "string", "title": "Estilo", "enum": ["automatico", *ESTILOS], "default": "automatico",
                   "description": "automatico toma los colores del logo o del tipo de negocio"}}},
    output_schema={"type": "object", "additionalProperties": False, "required": ["poster", "poster_alternativo", "resumen"],
                   "properties": {"poster": {**IMAGEN_SALIDA, "title": "Póster"},
                                  "poster_alternativo": {**IMAGEN_SALIDA, "title": "Póster (otra versión)"},
                                  "resumen": {**TEXTO, "title": "Resumen"}}},
    example_inputs={"negocio": "Frío Rico", "oferta": "2x1 en conos", "titular": "Refréscate al doble",
                    "llamada_accion": "Ven hoy"},
    example_parameters={"formato": "cuadrado", "estilo": "automatico"},
    constraints=["Las imágenes se procesan en Capacita y no se envían a ningún servicio.",
                 "Usa solo los textos que dio la persona: no inventa precios, teléfonos ni direcciones."],
    run=poster, max_requests=0)
