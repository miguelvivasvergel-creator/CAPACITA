"""Una decisión «create» siempre nombra qué crear: si no, el chat no tiene botón «Créala»."""
import unittest

from schemas.planner import PlannerProposal


class CrearSinFaltantesTests(unittest.TestCase):
    def test_create_sin_missing_usa_la_explicacion(self):
        propuesta = PlannerProposal(decision="create", explanation="Crear una herramienta que compare dos PDF palabra por palabra.")
        self.assertEqual(propuesta.missing, ["Crear una herramienta que compare dos PDF palabra por palabra."])

    def test_create_con_missing_vacios_tambien(self):
        propuesta = PlannerProposal(decision="create", explanation="Falta un conversor.", missing=["  ", ""])
        self.assertEqual(propuesta.missing, ["Falta un conversor."])

    def test_create_con_missing_los_conserva(self):
        propuesta = PlannerProposal(decision="create", explanation="x", missing=["Quitar fondo", "Póster"])
        self.assertEqual(propuesta.missing, ["Quitar fondo", "Póster"])

    def test_otras_decisiones_no_cambian(self):
        propuesta = PlannerProposal(decision="blocked", explanation="Necesita una cuenta que no hay.")
        self.assertEqual(propuesta.missing, [])


if __name__ == "__main__":
    unittest.main()
