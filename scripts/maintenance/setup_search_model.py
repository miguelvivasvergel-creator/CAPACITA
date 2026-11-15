"""Descarga explícita de dos artefactos ONNX/tokenizador fijados por revisión y hash."""
import hashlib
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))

import httpx
from providers.local_embeddings import FILES, MODEL_DIR, REPOSITORY, REVISION


def main():
    with httpx.Client(follow_redirects=True, timeout=90) as client:
        for name, (expected, size) in FILES.items():
            target = MODEL_DIR / name
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.is_file():
                with target.open('rb') as source:
                    if hashlib.file_digest(source, 'sha256').hexdigest() == expected:
                        print(f'OK ya validado: {name}', flush=True)
                        continue
                raise RuntimeError('Artefacto existente no coincide; revisar antes de reemplazarlo')
            temporary = target.with_suffix(target.suffix + '.part')
            digest, received = hashlib.sha256(), 0
            print(f'Descargando {name}: {size} bytes', flush=True)
            with client.stream('GET', f'https://huggingface.co/{REPOSITORY}/resolve/{REVISION}/{name}') as response:
                response.raise_for_status()
                with temporary.open('wb') as output:
                    for chunk in response.iter_bytes():
                        received += len(chunk)
                        if received > size:
                            raise RuntimeError('El archivo excede el tamaño fijado')
                        digest.update(chunk)
                        output.write(chunk)
            if received != size or digest.hexdigest() != expected:
                raise RuntimeError('El artefacto no coincide con tamaño/hash esperado')
            temporary.replace(target)
            print(f'OK hash verificado: {name}', flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
