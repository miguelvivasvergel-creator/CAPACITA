"""Tope global de la IA y frenos del bot: nadie agota solo la cuota ni inunda la base."""
import asyncio
import unittest
from datetime import date
from types import SimpleNamespace

import httpx
from fastapi import HTTPException

from core.cuota_ia import AGOTADA, OCUPADA, CuotaIA


class Reloj:
    def __init__(self):
        self.t, self.dia = 1000.0, date(2026, 11, 21)

    def __call__(self):
        return self.t


def cuota(por_minuto=3, por_dia=5):
    reloj = Reloj()
    return CuotaIA(por_minuto, por_dia, reloj=reloj, dia=lambda: reloj.dia), reloj


class CuotaIATests(unittest.TestCase):
    def test_minuto_lleno_dice_cuanto_esperar_y_el_dia_se_agota(self):
        c, reloj = cuota()
        self.assertEqual([c.tomar() for _ in range(3)], [0, 0, 0])
        self.assertEqual(c.tomar(), 60)  # el minuto está lleno: falta un minuto entero
        reloj.t += 45
        self.assertEqual(c.tomar(), 15)
        reloj.t += 15
        self.assertEqual([c.tomar(), c.tomar()], [0, 0])  # 5 del día
        reloj.t += 120
        self.assertIsNone(c.tomar())  # tope del día: no se espera, se avisa
        reloj.dia = date(2026, 11, 22)
        self.assertEqual(c.tomar(), 0)  # día nuevo en Colombia


class ProveedorTests(unittest.IsolatedAsyncioTestCase):
    def proveedor(self, c, dormidas):
        from providers.gemini import GeminiProvider

        async def dormir(s):
            dormidas.append(s)
        return GeminiProvider(transport=httpx.MockTransport(lambda r: httpx.Response(200, json={})), sleep=dormir, cuota=c)

    async def test_espera_un_turno_corto_y_explica_uno_largo_o_el_dia_agotado(self):
        c, reloj = cuota(por_minuto=1, por_dia=10)
        dormidas = []
        p = self.proveedor(c, dormidas)
        c.tomar()
        reloj.t += 50  # faltan 10 s: se espera (el reloj falso no avanza, así que luego pide 10 más → 20 s)
        with self.assertRaises(HTTPException) as error:
            await p._turno()
        self.assertEqual(dormidas, [10, 10])
        self.assertEqual((error.exception.status_code, error.exception.detail), (429, OCUPADA))
        c2, _ = cuota(por_minuto=5, por_dia=1)
        c2.tomar()
        with self.assertRaises(HTTPException) as error:
            await self.proveedor(c2, [])._turno()
        self.assertEqual(error.exception.detail, AGOTADA)

    async def test_las_pruebas_con_transporte_falso_no_gastan_la_cuota_real(self):
        from core.cuota_ia import CUOTA
        from providers.gemini import GeminiProvider
        self.assertIsNone(GeminiProvider(transport=httpx.MockTransport(lambda r: httpx.Response(200))).cuota)
        self.assertIs(GeminiProvider().cuota, CUOTA)


class IAEnEjecucionTests(unittest.TestCase):
    def test_sin_turno_la_ia_falla_con_un_codigo_que_la_persona_entiende(self):
        from unittest.mock import patch
        from connectors import ia
        from services.connector_broker import ConnectorFailure
        real = SimpleNamespace(transport=None)
        c, _ = cuota(por_minuto=5, por_dia=1)
        with patch("core.cuota_ia.CUOTA", c):
            ia.turno(real, dormir=lambda s: None)
            with self.assertRaises(ConnectorFailure) as error:
                ia.turno(real, dormir=lambda s: None)
        self.assertEqual(error.exception.code, "quota")
        c, _ = cuota(por_minuto=1, por_dia=10)
        c.tomar()
        with patch("core.cuota_ia.CUOTA", c), self.assertRaises(ConnectorFailure) as error:
            ia.turno(real, dormir=lambda s: None)
        self.assertEqual(error.exception.code, "provider_busy")


class RafagaTests(unittest.IsolatedAsyncioTestCase):
    def test_frena_por_10_segundos_y_por_minuto_avisando_una_vez(self):
        from services.telegram_bot import Rafaga
        reloj = Reloj()
        r = Rafaga(por_10s=3, por_minuto=5, reloj=reloj)
        self.assertEqual([r.permitir(1) for _ in range(5)], ["si", "si", "si", "avisar", "no"])
        self.assertEqual(r.permitir(2), "si")  # otro chat no se ve afectado
        reloj.t += 11
        self.assertEqual([r.permitir(1), r.permitir(1), r.permitir(1)], ["si", "si", "no"])  # 5 en el minuto
        reloj.t += 60
        self.assertEqual(r.permitir(1), "si")

    async def test_una_inundacion_no_llega_a_la_base(self):
        from services import telegram_bot as tb
        llamadas, dichos = [], []

        class Bot:
            def novedades(self, espera=0):
                return [(7, {"chat": {"id": 7, "type": "private"}, "text": "hola"}) for _ in range(30)]

            def responder(self, chat_id, texto, botones=None, html_=False):
                dichos.append(texto)
                return 1

        async def base(nombre, **datos):
            llamadas.append(nombre)
            return {"linked": False}
        servicios = SimpleNamespace(rafaga=tb.Rafaga(), tareas=set(), candados={}, limite=tb.Limite())
        await tb.atender(Bot(), base, "s", asyncio.to_thread, servicios)
        self.assertEqual(llamadas.count("telegram_owner"), 6)  # solo los 6 primeros tocan la base
        self.assertEqual(sum("Vas muy rápido" in d for d in dichos), 1)  # un solo aviso, no 24
