"""Diseño personalizable: listas de estilos, escalas y archivos de marca opcionales."""
import json
import unittest

from schemas.objectives import DefinitionDraft, draft_to_definition


def draft(**cambios):
    base = {
        "name": "Informe de ventas", "description": "Convierte un Excel de ventas en un informe PDF.",
        "category": "Documentos", "input_type": "datos", "output_type": "pdf",
        "inputs": [{"name": "hoja", "type": "string", "file": "excel"}],
        "parameters": [
            {"name": "estilo", "type": "string", "options": ["clasica", "moderna", "minimalista"]},
            {"name": "tamano_fuente", "type": "integer", "minimum": 8, "maximum": 24},
            {"name": "color_principal", "type": "string", "description": "Color hexadecimal"},
            {"name": "incluir_grafico", "type": "boolean"},
            {"name": "logo", "type": "string", "file": "png"},
        ],
        "outputs": [{"name": "informe", "type": "string", "file": "pdf"}],
        "example_inputs_json": json.dumps({"hoja": "MUESTRA:excel"}),
        "example_parameters_json": json.dumps({"estilo": "moderna", "tamano_fuente": 12, "color_principal": "#1F4E79",
                                               "incluir_grafico": True, "logo": "MUESTRA:foto"}),
        "example_output_json": json.dumps({"informe": "ARCHIVO"}),
    }
    base.update(cambios)
    return DefinitionDraft(**base)


class DraftPersonalizationTests(unittest.TestCase):
    def test_options_and_scales_become_contract_rules(self):
        definition = draft_to_definition(draft())
        props = definition.parameter_schema["properties"]
        self.assertEqual(props["estilo"]["enum"], ["clasica", "moderna", "minimalista"])
        self.assertEqual((props["tamano_fuente"]["minimum"], props["tamano_fuente"]["maximum"]), (8, 24))
        self.assertNotIn("enum", props["color_principal"])

    def test_brand_file_moves_to_optional_input_with_its_example(self):
        definition = draft_to_definition(draft())
        self.assertNotIn("logo", definition.parameter_schema["properties"])
        self.assertEqual(definition.input_schema["properties"]["logo"]["contentMediaType"], "image/png")
        self.assertNotIn("logo", definition.input_schema["required"])
        self.assertEqual(definition.examples[0].inputs["logo"], "MUESTRA:foto")
        self.assertNotIn("logo", definition.examples[0].parameters)

    def test_example_outside_the_options_is_rejected(self):
        malo = draft(example_parameters_json=json.dumps({"estilo": "barroca", "tamano_fuente": 12,
                                                          "color_principal": "#000000", "incluir_grafico": False}))
        with self.assertRaises(ValueError):
            draft_to_definition(malo)


if __name__ == "__main__":
    unittest.main()
