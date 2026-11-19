"""Contrato de entrega a B: integridad, errores y ausencia de ejecución."""
from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from uuid import uuid4

from fastapi import HTTPException
from pydantic import ValidationError

from schemas.candidates import CandidateManifest, PythonSourceProposal
from schemas.definitions import CapabilityDefinition
from services.candidate_preparation import prepare_candidate
from tests.fixtures.definitions import definition


class CandidatePreparationTests(unittest.TestCase):
    def prepare(self, source="def run(inputs, parameters):\n    return inputs\n", spec=None):
        return prepare_candidate(uuid4(), CapabilityDefinition(**(spec or definition())), PythonSourceProposal(source=source))

    def test_draft_is_serializable_and_cannot_claim_verified_status(self):
        candidate = self.prepare()
        self.assertEqual(candidate, CandidateManifest.model_validate_json(candidate.model_dump_json()))
        for field, value in (("status", "ready"), ("implementation_verified", True)):
            data = candidate.model_dump()
            data[field] = value
            with self.assertRaises(ValidationError):
                CandidateManifest(**data)

    def test_hash_tracks_code_contracts_and_constraints_independently_of_ids(self):
        first = self.prepare()
        second = self.prepare()
        self.assertNotEqual(first.candidate_id, second.candidate_id)
        self.assertEqual(first.artifact_hash, second.artifact_hash)
        self.assertNotEqual(first.artifact_hash, self.prepare("def run(inputs, parameters):\n    return {}\n").artifact_hash)
        changed = deepcopy(definition())
        changed["constraints"].append("Conservar espacios interiores")
        self.assertNotEqual(first.artifact_hash, self.prepare(spec=changed).artifact_hash)

    def test_source_is_never_executed_even_at_module_level(self):
        with TemporaryDirectory() as directory:
            marker = Path(directory) / "must-not-exist"
            source = f"open({str(marker)!r}, 'w').write('executed')\ndef run(inputs, parameters):\n    raise RuntimeError('must not run')\n"
            self.prepare(source)
            self.assertFalse(marker.exists())

    def test_invalid_syntax_or_entrypoint_is_rejected(self):
        for source in (
            "def broken(", "x = 1", "async def run(inputs, parameters): pass",
            "def run(inputs): pass", "def run(inputs, parameters=None): pass",
            "def run(inputs, parameters): pass\ndef run(inputs, parameters): pass",
            "@unknown\ndef run(inputs, parameters): pass",
        ):
            with self.subTest(source=source), self.assertRaises(HTTPException):
                self.prepare(source)

    def test_utf8_byte_limit_and_invalid_examples_are_rejected(self):
        with self.assertRaises(HTTPException):
            self.prepare("#" + "á" * 33000 + "\ndef run(inputs, parameters): pass")
        invalid = definition()
        invalid["examples"][0]["inputs"] = {}
        with self.assertRaises(HTTPException):
            self.prepare(spec=invalid)

    def test_external_dependencies_cannot_be_requested_in_initial_runtime(self):
        with self.assertRaises(ValidationError):
            PythonSourceProposal(source="pass", dependencies=["unknown-package"])


class ToolboxImportTests(unittest.TestCase):
    def test_only_stdlib_and_toolbox_imports_are_accepted(self):
        import ast
        from services.candidate_preparation import unavailable_imports
        allowed = "import json, io\nfrom pypdf import PdfReader\nimport docx\nfrom PIL import Image\nimport openpyxl\nfrom reportlab.pdfgen import canvas"
        self.assertEqual(unavailable_imports(ast.parse(allowed)), [])
        # Caja v2 (fase 4): pandas, numpy, matplotlib, rembg, pytesseract y OpenCV ya están instaladas.
        v2 = "import pandas as pd\nfrom numpy import array\nimport matplotlib.pyplot as plt\nfrom capacita_fondo import quitar_fondo\nimport pytesseract\nimport cv2"
        self.assertEqual(unavailable_imports(ast.parse(v2)), [])
        # Red, librerías no instaladas, rembg (pasa de 60 s en gVisor) e imports relativos siguen fuera.
        self.assertEqual(unavailable_imports(ast.parse("import requests\nimport torch\nimport rembg\nfrom . import x")),
                         [".", "rembg", "requests", "torch"])
