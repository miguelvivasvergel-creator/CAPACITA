"""Receta comprobada: marcar las diferencias entre dos PDF ENCIMA del PDF nuevo.

No es código que corra en la API: su texto se copia en el protocolo de la fábrica (gemini.py) para
que la herramienta generada lo use tal cual dentro del sandbox (pypdf 5.1 y reportlab 4.2 de la
imagen toolbox-v2). Antes cada herramienta reinventaba cómo comparar PDF y entregaba un documento
nuevo hecho desde cero: se perdían el diseño, las fuentes y las páginas del original.

Qué hace: lee cada palabra de los dos PDF con su posición, las compara en orden (difflib) y sobre
las MISMAS páginas del PDF nuevo subraya lo agregado o cambiado; donde se quitó texto pone una marca
y una nota con lo eliminado. Todo lo demás del PDF (páginas, fuentes, imágenes, enlaces y marcadores)
queda igual. Con lista_de_cambios=True agrega al final una página con cada cambio (antes → después).
Un PDF escaneado (sin texto seleccionable) no se puede comparar así: ValueError con el motivo.
"""
import difflib
import io
import re
from xml.sax.saxutils import escape

from pypdf import PdfReader, PdfWriter
from pypdf._cmap import build_font_width_map, get_encoding
from pypdf.annotations import Text
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase.pdfmetrics import standardFonts, stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _por(m, n):
    return [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2],
            m[2] * n[1] + m[3] * n[3], m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5]]


def _medidor(fuente):
    """Ancho de un texto (en unidades de 1/1000 del tamaño) con las medidas reales de la fuente.

    Las fuentes incrustadas (Word, navegadores) renumeran las letras: se traduce cada letra a su
    código con la tabla de la propia fuente antes de buscar su ancho. Las 14 estándar (sin anchos
    en el PDF) se miden con reportlab."""
    fuente = fuente or {}
    if "/Widths" not in fuente and "/DescendantFonts" not in fuente:
        base = str(fuente.get("/BaseFont", "/Helvetica")).lstrip("/")
        base = base if base in standardFonts else "Helvetica"
        return lambda texto: stringWidth(texto, base, 1000) / 1000
    try:
        codificacion, mapa = get_encoding(fuente)
        anchos = build_font_width_map(fuente, 500.0)
    except Exception:
        return lambda texto: stringWidth(texto, "Helvetica", 1000) / 1000
    codigo_de = {}
    if isinstance(codificacion, dict):
        for codigo, letra in codificacion.items():
            codigo_de.setdefault(letra, chr(codigo))
    for clave, letra in (mapa or {}).items():
        if isinstance(clave, str) and isinstance(letra, str) and len(letra) == 1 and 1 <= len(clave) <= 2:
            codigo_de[letra] = clave if len(clave) == 1 else chr(ord(clave[0]) * 256 + ord(clave[1]))
    defecto = float(anchos.get("default") or 500.0)
    return lambda texto: sum(float(anchos.get(codigo_de.get(letra, letra), defecto)) for letra in texto) / 1000


def palabras_pdf(datos):
    """Lector del PDF y sus palabras en orden: (texto, página, x0, x1, y de la base, alto)."""
    try:
        lector = PdfReader(io.BytesIO(datos))
    except Exception:
        raise ValueError("No pude abrir uno de los archivos como PDF") from None
    palabras, medidores = [], {}
    for numero, pagina in enumerate(lector.pages):
        def visitar(texto, cm_actual, tm_actual, fuente, tam, numero=numero):
            if not texto or not texto.strip():
                return
            texto = texto.replace("\r", " ").replace("\n", " ")
            if id(fuente) not in medidores:
                medidores[id(fuente)] = (_medidor(fuente), fuente)  # guarda la fuente: el id no se reutiliza
            medir = medidores[id(fuente)][0]
            tam = tam or 10
            m = _por(tm_actual, cm_actual)
            escala = tam * ((m[0] ** 2 + m[1] ** 2) ** 0.5 or 1.0)
            alto = tam * ((m[2] ** 2 + m[3] ** 2) ** 0.5 or 1.0)
            for hallada in re.finditer(r"\S+", texto):
                x0 = m[4] + medir(texto[:hallada.start()]) * escala
                x1 = x0 + medir(hallada.group()) * escala
                palabras.append((hallada.group(), numero, x0, x1, m[5], alto))
        pagina.extract_text(visitor_text=visitar)
    return lector, palabras


def _segmentos(cajas):
    """Une las palabras seguidas de una misma línea en un solo subrayado."""
    unidas = []
    for pagina, x0, x1, y, alto in cajas:
        if unidas and unidas[-1][0] == pagina and abs(unidas[-1][3] - y) < 1 and 0 <= x0 - unidas[-1][2] < alto:
            unidas[-1][2] = x1
        else:
            unidas.append([pagina, x0, x1, y, alto])
    return unidas


def _pagina_de_cambios(cambios, color_agregado, color_eliminado):
    buffer = io.BytesIO()
    estilos = getSampleStyleSheet()
    total = len(cambios)
    elementos = [Paragraph("Lista de cambios", estilos["Title"]), Paragraph(
        f"{total} cambio{'s' if total != 1 else ''}. En las páginas anteriores (el PDF nuevo, sin otros cambios) "
        "está subrayado lo agregado o cambiado; la marca roja señala dónde se quitó texto y su nota dice qué.",
        estilos["BodyText"]), Spacer(1, 10)]
    if cambios:
        filas = [["Pág.", "Antes", "Después"]] + [
            [str(c["pagina"]), Paragraph(escape(c["antes"] or "—"), estilos["BodyText"]),
             Paragraph(escape(c["despues"] or "—"), estilos["BodyText"])] for c in cambios[:200]]
        tabla = Table(filas, colWidths=[1.4 * cm, 7.6 * cm, 7.6 * cm], repeatRows=1)
        tabla.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F2937")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
            ("TEXTCOLOR", (1, 1), (1, -1), colors.HexColor(color_eliminado)),
            ("TEXTCOLOR", (2, 1), (2, -1), colors.HexColor(color_agregado))]))
        elementos.append(tabla)
    else:
        elementos.append(Paragraph("Los dos PDF tienen el mismo texto.", estilos["BodyText"]))
    SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm).build(elementos)
    buffer.seek(0)
    return PdfReader(buffer).pages


def comparar_pdf(original, nueva, color_agregado="#00873C", color_eliminado="#C00000", lista_de_cambios=True):
    """original y nueva son bytes de PDF. Devuelve (bytes del PDF nuevo marcado, resumen)."""
    _, viejas = palabras_pdf(original)
    lector, nuevas = palabras_pdf(nueva)
    if not viejas or not nuevas:
        raise ValueError("Uno de los PDF no tiene texto seleccionable (parece escaneado): no puedo compararlo palabra por palabra")
    antes, despues = [p[0] for p in viejas], [p[0] for p in nuevas]
    agregadas, notas, cambios = [], [], []
    for operacion, i1, i2, j1, j2 in difflib.SequenceMatcher(None, antes, despues, autojunk=False).get_opcodes():
        if operacion == "equal":
            continue
        agregadas += [(p[1], p[2], p[3], p[4], p[5]) for p in nuevas[j1:j2]]
        quitado, puesto = " ".join(antes[i1:i2]), " ".join(despues[j1:j2])
        ancla = nuevas[min(j1, len(nuevas) - 1)]
        if quitado:
            notas.append((ancla[1], ancla[2] if j1 < len(nuevas) else ancla[3], ancla[4], ancla[5], quitado))
        cambios.append({"pagina": ancla[1] + 1, "antes": quitado, "despues": puesto})
    escritor = PdfWriter(clone_from=lector)
    por_pagina = {}
    for pagina, x0, x1, y, alto in _segmentos(agregadas):
        por_pagina.setdefault(pagina, []).append(("agregado", x0, x1, y, alto))
    for pagina, x, y, alto, _ in notas:
        por_pagina.setdefault(pagina, []).append(("eliminado", x, x, y, alto))
    for numero, marcas in por_pagina.items():
        caja = escritor.pages[numero].mediabox
        buffer = io.BytesIO()
        lienzo = canvas.Canvas(buffer, pagesize=(float(caja.right), float(caja.top)))
        for tipo, x0, x1, y, alto in marcas:
            lienzo.setLineWidth(max(0.8, alto * 0.08))
            if tipo == "agregado":
                lienzo.setStrokeColor(colors.HexColor(color_agregado))
                lienzo.line(x0, y - alto * 0.18, x1, y - alto * 0.18)
            else:
                lienzo.setStrokeColor(colors.HexColor(color_eliminado))
                lienzo.setFillColor(colors.HexColor(color_eliminado))
                lienzo.line(x0 - 1.5, y - alto * 0.25, x0 - 1.5, y + alto * 0.85)
                lienzo.circle(x0 - 1.5, y + alto * 0.95, max(1.5, alto * 0.12), stroke=0, fill=1)
        lienzo.save()
        buffer.seek(0)
        escritor.pages[numero].merge_page(PdfReader(buffer).pages[0])
    # La nota con lo eliminado va en el margen izquierdo de su renglón: su ícono no tapa el texto.
    for pagina, x, y, alto, quitado in notas:
        izquierda = float(escritor.pages[pagina].mediabox.left) + 6
        escritor.add_annotation(pagina, Text(rect=(izquierda, y - 2, izquierda + 16, y + 14), text=f"Eliminado: {quitado}"[:500]))
    if lista_de_cambios:
        for pagina in _pagina_de_cambios(cambios, color_agregado, color_eliminado):
            escritor.add_page(pagina)
    salida = io.BytesIO()
    escritor.write(salida)
    resumen = {"cambios": len(cambios), "palabras_agregadas": sum(len(c["despues"].split()) for c in cambios),
               "palabras_eliminadas": sum(len(c["antes"].split()) for c in cambios), "detalle": cambios}
    return salida.getvalue(), resumen
