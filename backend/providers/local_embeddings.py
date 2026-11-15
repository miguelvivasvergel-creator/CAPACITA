"""Embeddings E5 locales y fijos. Nunca descarga artefactos durante una petición."""
import hashlib
import importlib.util
from pathlib import Path
import threading

from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / 'output/search/model'
REPOSITORY = 'Xenova/multilingual-e5-small'
REVISION = '761b726dd34fb83930e26aab4e9ac3899aa1fa78'
FILES = {
    'onnx/model_quantized.onnx': ('f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193', 118308185),
    'tokenizer.json': ('0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39', 17082730),
}
MODEL_ID = f'{REPOSITORY}@{REVISION}:mean-l2-512-v1'
DIMENSION = 384


class LocalEmbeddings:
    model_id = MODEL_ID
    dimension = DIMENSION

    def __init__(self, directory=MODEL_DIR):
        self.directory = Path(directory)
        self._session = None
        self._tokenizer = None
        self._lock = threading.Lock()

    def available(self):
        return (all(importlib.util.find_spec(name) is not None for name in ('onnxruntime', 'tokenizers', 'numpy'))
                and all((self.directory / name).is_file() and (self.directory / name).stat().st_size == size for name, (_, size) in FILES.items()))

    def _load(self):
        if self._session is not None:
            return
        if not self.available():
            raise HTTPException(503, 'La búsqueda semántica local no está instalada. Usa búsqueda textual.')
        for name, (expected, _) in FILES.items():
            with (self.directory / name).open('rb') as stream:
                actual = hashlib.file_digest(stream, 'sha256').hexdigest()
            if actual != expected:
                raise HTTPException(503, 'El modelo local no supera la validación de integridad')
        import onnxruntime as ort
        from tokenizers import Tokenizer
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        session = ort.InferenceSession(str(self.directory / 'onnx/model_quantized.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
        tokenizer = Tokenizer.from_file(str(self.directory / 'tokenizer.json'))
        tokenizer.enable_truncation(max_length=512)
        tokenizer.enable_padding(pad_id=1, pad_token='<pad>')
        self._session, self._tokenizer = session, tokenizer

    def encode(self, texts, *, query=False):
        # Un modelo/tokenizador compartido, sin inferencias concurrentes ni colas internas.
        with self._lock:
            self._load()
            import numpy as np
            result = []
            prefix = 'query: ' if query else 'passage: '
            for start in range(0, len(texts), 8):
                tokens = self._tokenizer.encode_batch([prefix + text for text in texts[start:start + 8]])
                inputs = {
                    'input_ids': np.asarray([item.ids for item in tokens], dtype=np.int64),
                    'attention_mask': np.asarray([item.attention_mask for item in tokens], dtype=np.int64),
                    'token_type_ids': np.asarray([item.type_ids for item in tokens], dtype=np.int64),
                }
                feed = {item.name: inputs[item.name] for item in self._session.get_inputs()}
                hidden = self._session.run(None, feed)[0]
                mask = inputs['attention_mask'][..., None]
                mean = (hidden * mask).sum(axis=1) / np.maximum(mask.sum(axis=1), 1)
                normalized = mean / np.maximum(np.linalg.norm(mean, axis=1, keepdims=True), 1e-12)
                if normalized.shape[1] != DIMENSION or not np.isfinite(normalized).all():
                    raise HTTPException(503, 'El modelo local devolvió vectores inválidos')
                result.extend(normalized.tolist())
            return result


local_embeddings = LocalEmbeddings()
