"""Quitar el fondo de una foto con el modelo local u2netp, sin red (caja de herramientas v2).

Se instala dentro de la imagen del sandbox. Usa onnxruntime directamente: el paquete rembg trae
numba, scipy y scikit-image, que bajo gVisor tardan más de un minuto solo en importarse. Mismo
modelo y mismo preprocesamiento que rembg (u2netp, 320×320, normalización de ImageNet).

    from capacita_fondo import quitar_fondo
    recorte = quitar_fondo(imagen_pil)            # PNG con transparencia (RGBA)
"""
import numpy as np
import onnxruntime as ort
from PIL import Image

MODELO = "/opt/u2net/u2netp.onnx"
_sesion = None


def _cargar():
    global _sesion
    if _sesion is None:
        opciones = ort.SessionOptions()
        opciones.intra_op_num_threads = 1
        opciones.inter_op_num_threads = 1
        _sesion = ort.InferenceSession(MODELO, opciones, providers=["CPUExecutionProvider"])
    return _sesion


def mascara(imagen):
    """Máscara en escala de grises (L) del mismo tamaño: blanco = objeto, negro = fondo."""
    foto = imagen.convert("RGB")
    x = np.asarray(foto.resize((320, 320), Image.LANCZOS), dtype=np.float32) / 255.0
    x = (x - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / np.array([0.229, 0.224, 0.225], dtype=np.float32)
    sesion = _cargar()
    salida = sesion.run(None, {sesion.get_inputs()[0].name: x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0, 0]
    salida = (salida - salida.min()) / (salida.max() - salida.min() + 1e-8)
    return Image.fromarray((salida * 255).astype("uint8")).resize(foto.size, Image.LANCZOS)


def quitar_fondo(imagen, nitidez=0.0):
    """Foto RGBA con el fondo transparente. nitidez 0..1 endurece el borde (0 = suave)."""
    alfa = mascara(imagen)
    if nitidez > 0:
        corte = int(128 * min(max(nitidez, 0.0), 1.0))
        alfa = alfa.point(lambda valor: 0 if valor < corte else (255 if valor > 255 - corte else valor))
    recorte = imagen.convert("RGB")
    recorte.putalpha(alfa)
    return recorte
