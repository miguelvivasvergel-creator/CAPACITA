"""Evaluación real local con ejemplos públicos fijos; sin Supabase ni proveedor IA."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))

from providers.local_embeddings import local_embeddings

DOCUMENTS = [
    'Quitar fondo de imagen. Elimina el fondo de una fotografía y devuelve un PNG transparente.',
    'Traducir texto. Convierte un escrito al idioma destino, por ejemplo del inglés al español.',
    'Resumir texto. Genera un resumen breve de un documento largo con sus ideas principales.',
    'Inventario agotado. Detecta productos sin existencias y lista mercancía que necesita reposición.',
    'Extraer texto de PDF. Lee un archivo PDF digital y devuelve su contenido textual.',
    'Normalizar espacios. Quita espacios al inicio y final del texto, conservando espacios interiores.',
]
CASES = [
    ('necesito aislar a una persona de su fotografía', 0),
    ('comprender en castellano un escrito en otro idioma', 1),
    ('Get the main ideas from a long report.', 2),
    ('saber qué mercancía se terminó en la bodega', 3),
    ('leer las palabras que hay dentro de un documento PDF', 4),
    ('eliminar blancos al principio y al final de una frase', 5),
]


def main():
    vectors = local_embeddings.encode(DOCUMENTS)
    queries = local_embeddings.encode([query for query, _ in CASES], query=True)
    tests = []
    for (query, expected), vector in zip(CASES, queries):
        scores = [sum(a * b for a, b in zip(vector, document)) for document in vectors]
        actual = max(range(len(scores)), key=scores.__getitem__)
        passed = actual == expected
        tests.append({'query': query, 'expected': expected, 'actual': actual, 'passed': passed})
        print(f'{"PASS" if passed else "FAIL"} expected={expected} actual={actual}: {query}', flush=True)
    report = {'model_id': local_embeddings.model_id, 'dimensions': len(vectors[0]),
              'passed': all(row['passed'] for row in tests), 'tests': tests,
              'limits': 'Seis casos públicos no demuestran equivalencia ni precisión universal.'}
    output = ROOT / 'output/search/model-evaluation.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
