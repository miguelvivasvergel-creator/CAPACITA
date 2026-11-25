"""Genera public/muestras/documento.pdf y documento_v2.pdf (PDF con texto seleccionable).

El documento.pdf anterior era una IMAGEN pegada en una página: no tenía texto, así que toda
herramienta de PDF que leía texto (comparar, resumir, extraer) probaba con un archivo vacío y la
vista previa salía en cero. Ahora los dos PDF tienen el mismo texto que documento.docx y
documento_v2.docx (las muestras de Word): 12 → 18 por ciento y un párrafo nuevo al final.

Se ejecuta dentro de la imagen del sandbox (reportlab 4.2), sin red:
  docker run --rm --network none -v <repo>:/r capacita-toolbox:v2 python /r/scripts/muestras/generar_pdf_muestra.py
"""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

DESTINO = Path(__file__).resolve().parents[2] / "public" / "muestras"
TITULO = "Informe de ventas de la semana"
ORIGINAL = ["Las ventas subieron un 12 por ciento.", "El plato mas pedido fue el arroz con pollo."]
NUEVA = ["Las ventas subieron un 18 por ciento.", "El plato mas pedido fue el arroz con pollo.",
         "Desde el lunes el almuerzo cuesta $18.000."]


def pie(lienzo, doc):
    lienzo.saveState()
    lienzo.setFont("Helvetica", 8)
    lienzo.setFillColor(colors.HexColor("#64748B"))
    lienzo.drawCentredString(A4[0] / 2, 1.2 * cm, "Restaurante de muestra · Página 1")
    lienzo.restoreState()


def generar(nombre, parrafos):
    estilos = getSampleStyleSheet()
    titulo = ParagraphStyle("titulo", parent=estilos["Title"], textColor=colors.HexColor("#1E3A8A"), alignment=0)
    cuerpo = ParagraphStyle("cuerpo", parent=estilos["BodyText"], fontSize=12, leading=18)
    elementos = [Paragraph(TITULO, titulo), Spacer(1, 12)]
    for texto in parrafos:
        elementos += [Paragraph(texto, cuerpo), Spacer(1, 6)]
    doc = SimpleDocTemplate(str(DESTINO / nombre), pagesize=A4, leftMargin=2.5 * cm, rightMargin=2.5 * cm,
                            title="documento", author="Capacita (muestra)", invariant=1)
    doc.build(elementos, onFirstPage=pie, onLaterPages=pie)


if __name__ == "__main__":
    generar("documento.pdf", ORIGINAL)
    generar("documento_v2.pdf", NUEVA)
    print("muestras PDF listas en", DESTINO)
