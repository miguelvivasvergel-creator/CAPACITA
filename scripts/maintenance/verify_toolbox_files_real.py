"""Comprobación REAL del entorno aislado con archivos, sin Gemini ni Supabase.

Ejecuta en gVisor (perfil caja de herramientas) tres herramientas escritas a mano, con el
mismo camino que usa el trabajador para probar (execute_job kind=build: contratos, casos,
comparación "ARCHIVO") y para ejecutar (kind=run):
  1. Foto: filtro cálido graduable + nombre del local encima (Pillow).
  2. PDF: portada con título + documento original (reportlab + pypdf).
  3. Excel de ventas -> informe PDF con totales (openpyxl + reportlab).
Más un caso negativo: devolver un PDF donde se espera una foto debe fallar.

No usa la red ni credenciales. Requiere WSL/Docker/runsc como el trabajador y que nadie
esté probando herramientas en ese momento (el sandbox admite un trabajo a la vez).
Uso, desde la raíz:  .venv\\Scripts\\python.exe scripts\\maintenance\\verify_toolbox_files_real.py
"""
import base64
import io
import json
from pathlib import Path
import sys
import time
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from schemas.candidates import PythonSourceProposal  # noqa: E402
from schemas.definitions import CapabilityDefinition  # noqa: E402
from services.candidate_preparation import prepare_candidate  # noqa: E402
from services.execution_engine import PROFILE, execute_job  # noqa: E402

MUESTRAS = ROOT / "public" / "muestras"
B64 = {"type": "string", "contentEncoding": "base64"}
JPEG, PDF = "image/jpeg", "application/pdf"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def archivo(media, description):
    return {**B64, "contentMediaType": media, "description": description}


def muestra(nombre):
    return base64.b64encode((MUESTRAS / nombre).read_bytes()).decode()


def definicion(name, description, inputs, parameters, output, example_inputs, example_parameters, expected=None):
    return CapabilityDefinition(**{
        "name": name, "description": description, "category": "Archivos", "input_type": "datos", "output_type": "datos",
        "input_schema": {"type": "object", "properties": inputs, "required": list(inputs), "additionalProperties": False},
        "parameter_schema": {"type": "object", "properties": parameters, "required": list(parameters), "additionalProperties": False},
        "output_schema": {"type": "object", "properties": output, "required": list(output), "additionalProperties": False},
        "constraints": [], "required_permissions": [], "resources": [], "failure_cases": [],
        "examples": [{"inputs": example_inputs, "parameters": example_parameters,
                      "expected_output": expected or {key: "ARCHIVO" for key in output}}],
    })


FOTO_SRC = '''import base64, io
from PIL import Image, ImageDraw, ImageEnhance, ImageFont


def run(inputs, parameters):
    imagen = Image.open(io.BytesIO(base64.b64decode(inputs["foto"]))).convert("RGB")
    intensidad = max(0.0, min(1.0, float(parameters["intensidad"])))
    r, g, b = imagen.split()
    r = r.point(lambda v: min(255, int(v * (1 + 0.25 * intensidad))))
    b = b.point(lambda v: int(v * (1 - 0.2 * intensidad)))
    imagen = ImageEnhance.Contrast(Image.merge("RGB", (r, g, b))).enhance(1 + 0.2 * intensidad)
    texto = inputs["nombre"][:60]
    lienzo = ImageDraw.Draw(imagen)
    fuente = ImageFont.load_default(size=max(16, imagen.width // 14))
    caja = lienzo.textbbox((0, 0), texto, font=fuente)
    x = (imagen.width - (caja[2] - caja[0])) // 2
    y = imagen.height - (caja[3] - caja[1]) - imagen.height // 12
    lienzo.text((x, y), texto, font=fuente, fill="white", stroke_width=3, stroke_fill="black")
    salida = io.BytesIO()
    imagen.save(salida, "JPEG", quality=88)
    return {"imagen": base64.b64encode(salida.getvalue()).decode()}
'''

PDF_SRC = '''import base64, io
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


def run(inputs, parameters):
    original = PdfReader(io.BytesIO(base64.b64decode(inputs["documento"])))
    portada = io.BytesIO()
    hoja = canvas.Canvas(portada, pagesize=letter)
    hoja.setFont("Helvetica-Bold", 28)
    hoja.drawCentredString(letter[0] / 2, letter[1] / 2, parameters["titulo"][:80])
    hoja.showPage()
    hoja.save()
    escritor = PdfWriter()
    escritor.add_page(PdfReader(io.BytesIO(portada.getvalue())).pages[0])
    for pagina in original.pages:
        escritor.add_page(pagina)
    salida = io.BytesIO()
    escritor.write(salida)
    return {"pdf": base64.b64encode(salida.getvalue()).decode(), "paginas": len(escritor.pages)}
'''

EXCEL_SRC = '''import base64, io
from openpyxl import load_workbook
from reportlab.lib.pagesizes import letter
from reportlab.platypus import Paragraph, SimpleDocTemplate, Table
from reportlab.lib.styles import getSampleStyleSheet


def run(inputs, parameters):
    libro = load_workbook(io.BytesIO(base64.b64decode(inputs["hoja"])), read_only=True, data_only=True)
    filas = [[("" if celda is None else celda) for celda in fila] for fila in libro.active.iter_rows(values_only=True)]
    filas = [fila for fila in filas if any(str(c).strip() for c in fila)]
    total = 0.0
    for fila in filas[1:]:
        for celda in fila:
            if isinstance(celda, (int, float)) and not isinstance(celda, bool):
                total += celda
    salida = io.BytesIO()
    estilos = getSampleStyleSheet()
    doc = SimpleDocTemplate(salida, pagesize=letter)
    doc.build([Paragraph(parameters["titulo"][:80], estilos["Title"]),
               Table([[str(c) for c in fila] for fila in filas[:200]]),
               Paragraph(f"Total: {total:g}", estilos["Heading2"])])
    return {"informe": base64.b64encode(salida.getvalue()).decode(), "filas": max(0, len(filas) - 1), "total": total}
'''


def job(manifest, kind, payload):
    return {"kind": kind, "candidate_id": str(manifest.candidate_id), "artifact_hash": manifest.artifact_hash,
            "payload": {"manifest": manifest.model_dump(mode="json"), **payload}}


def probar(nombre, spec, source, inputs, parameters, revisar):
    manifest = prepare_candidate(uuid4(), spec, PythonSourceProposal(source=source))
    expected = spec.examples[0].expected_output
    inicio = time.monotonic()
    caso = {"name": nombre, "inputs": inputs, "parameters": parameters, "expected_output": expected, "expect_rejection": False}
    status, report, _ = execute_job(job(manifest, "build", {"cases": [caso]}))
    prueba = round(time.monotonic() - inicio, 1)
    inicio = time.monotonic()
    run_status, run_report, output = execute_job(job(manifest, "run", {"inputs": inputs, "parameters": parameters, "profile": PROFILE}))
    detalle = revisar(output) if output else None
    return {"herramienta": nombre, "prueba": status, "casos": report.get("cases"), "segundos_prueba": prueba,
            "ejecucion": run_status, "error": run_report.get("error"), "segundos_ejecucion": round(time.monotonic() - inicio, 1),
            "detalle": detalle}


def main():
    from PIL import Image  # solo revisa en el host el archivo devuelto; nunca ejecuta el candidato
    resultados = []
    foto = definicion("Foto con filtro y nombre", "Aplica un filtro cálido graduable y escribe el nombre del local.",
                      {"foto": archivo(JPEG, "Foto del plato"), "nombre": {"type": "string", "description": "Nombre del local"}},
                      {"intensidad": {"type": "number", "minimum": 0, "maximum": 1}},
                      {"imagen": archivo(JPEG, "Foto lista")}, {"foto": "MUESTRA:foto", "nombre": "La Fogata"}, {"intensidad": 0.5})

    def revisar_foto(output):
        imagen = Image.open(io.BytesIO(base64.b64decode(output["imagen"])))
        return {"formato": imagen.format, "tamano": imagen.size, "kb": len(output["imagen"]) * 3 // 4 // 1024}
    resultados.append(probar("foto", foto, FOTO_SRC, {"foto": muestra("foto.jpg"), "nombre": "La Fogata"}, {"intensidad": 0.5}, revisar_foto))

    pdf = definicion("Portada para PDF", "Agrega una portada con un título al inicio del PDF.",
                     {"documento": archivo(PDF, "PDF original")}, {"titulo": {"type": "string"}},
                     {"pdf": archivo(PDF, "PDF con portada"), "paginas": {"type": "integer"}},
                     {"documento": "MUESTRA:pdf"}, {"titulo": "Informe mensual"},
                     {"pdf": "ARCHIVO", "paginas": 2})  # la muestra tiene una página

    def revisar_pdf(output):
        return {"empieza_por_%PDF": base64.b64decode(output["pdf"]).startswith(b"%PDF"), "paginas": output["paginas"]}
    resultados.append(probar("pdf", pdf, PDF_SRC, {"documento": muestra("documento.pdf")}, {"titulo": "Informe mensual"}, revisar_pdf))

    # hoja.xlsx: 3 productos; suma de cantidades y precios = 42+18000+30+9000+55+5000.
    filas, total = 4, 32127.0
    excel = definicion("Excel a informe PDF", "Convierte una hoja de ventas en un informe PDF con el total.",
                       {"hoja": archivo(XLSX, "Excel de ventas")}, {"titulo": {"type": "string"}},
                       {"informe": archivo(PDF, "Informe"), "filas": {"type": "integer"}, "total": {"type": "number"}},
                       {"hoja": "MUESTRA:excel"}, {"titulo": "Ventas"},
                       {"informe": "ARCHIVO", "filas": filas - 1, "total": total})

    def revisar_excel(output):
        return {"empieza_por_%PDF": base64.b64decode(output["informe"]).startswith(b"%PDF"), "filas": output["filas"], "total": output["total"]}
    resultados.append(probar("excel", excel, EXCEL_SRC, {"hoja": muestra("hoja.xlsx")}, {"titulo": "Ventas"}, revisar_excel))

    # Negativo: un PDF donde se espera una foto no puede pasar la prueba.
    trampa = "import base64\n\n\ndef run(inputs, parameters):\n    return {'imagen': base64.b64encode(b'%PDF-1.4 falso').decode()}\n"
    negativo = probar("negativo", foto, trampa, {"foto": muestra("foto.jpg"), "nombre": "X"}, {"intensidad": 0.1}, lambda _: None)

    ok = (all(r["prueba"] == "passed" and r["ejecucion"] == "completed" for r in resultados)
          and negativo["prueba"] == "failed" and negativo["casos"][0]["reason"] == "output_mismatch")
    print(json.dumps({"passed": ok, "resultados": resultados, "negativo": {k: negativo[k] for k in ("prueba", "casos")}},
                     ensure_ascii=False, indent=1))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
