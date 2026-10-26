using CAPACITA.API.Models;

namespace CAPACITA.API.Data
{
    public static class DbSeeder
    {
        public static void Seed(AppDbContext db)
        {
            if (db.Perfiles.Any()) return;

            var franklin = new Perfil { Username = "franklin_dev", DisplayName = "Franklin", Bio = "Backend y bases de datos. Construyendo Capacita.", ClonesHechos = 3 };
            var fahida = new Perfil { Username = "fahida_dev", DisplayName = "Fahida", Bio = "IA y automatización.", ClonesHechos = 1 };
            var luis = new Perfil { Username = "luismiguel_dev", DisplayName = "Luis Miguel", Bio = "Frontend y diseño.", ClonesHechos = 5 };
            var miguel = new Perfil { Username = "miguel_dev", DisplayName = "Miguel", Bio = "Interfaces y experiencia de usuario.", ClonesHechos = 0 };
            db.Perfiles.AddRange(franklin, fahida, luis, miguel);

            var ahora = DateTime.UtcNow;

            db.Capacidades.AddRange(
                new Capacidad { Nombre = "Quitar fondo de imagen", Descripcion = "Elimina el fondo de cualquier foto y devuelve un PNG transparente.", TipoEntrada = "imagen", TipoSalida = "imagen", Visibilidad = "public", UsosCount = 142, FechaCreacion = ahora.AddDays(-23), Perfil = franklin },
                new Capacidad { Nombre = "Extraer texto de PDF", Descripcion = "Lee un PDF y devuelve todo su contenido en texto limpio.", TipoEntrada = "pdf", TipoSalida = "texto", Visibilidad = "public", UsosCount = 89, FechaCreacion = ahora.AddDays(-20), Perfil = fahida },
                new Capacidad { Nombre = "Traducir texto al español", Descripcion = "Traduce cualquier texto al español manteniendo el tono.", TipoEntrada = "texto", TipoSalida = "texto", Visibilidad = "public", UsosCount = 120, FechaCreacion = ahora.AddDays(-15), Perfil = luis },
                new Capacidad { Nombre = "Resumir texto", Descripcion = "Condensa un texto largo en puntos clave.", TipoEntrada = "texto", TipoSalida = "texto", Visibilidad = "public", UsosCount = 76, FechaCreacion = ahora.AddDays(-10), Perfil = fahida },
                new Capacidad { Nombre = "Transcribir audio", Descripcion = "Convierte una nota de voz en texto.", TipoEntrada = "audio", TipoSalida = "texto", Visibilidad = "public", UsosCount = 33, FechaCreacion = ahora.AddDays(-5), Perfil = miguel },
                new Capacidad { Nombre = "Analizador privado de notas", Descripcion = "Capacidad personal en pruebas.", TipoEntrada = "texto", TipoSalida = "datos", Visibilidad = "private", UsosCount = 4, FechaCreacion = ahora.AddDays(-2), Perfil = franklin }
            );

            var wf1 = new Workflow
            {
                Nombre = "PDF a resumen en español",
                Descripcion = "Toma un PDF en inglés y entrega un resumen traducido al español.",
                Visibilidad = "public",
                UsosCount = 54,
                FechaCreacion = ahora.AddDays(-12),
                Perfil = luis,
                Pasos = { new WorkflowPaso { Orden = 1, Nombre = "Extraer texto" }, new WorkflowPaso { Orden = 2, Nombre = "Traducir" }, new WorkflowPaso { Orden = 3, Nombre = "Resumir" } }
            };
            var wf2 = new Workflow
            {
                Nombre = "Audio a resumen",
                Descripcion = "Transcribe una nota de voz y la resume en puntos clave.",
                Visibilidad = "public",
                UsosCount = 21,
                FechaCreacion = ahora.AddDays(-4),
                Perfil = franklin,
                Pasos = { new WorkflowPaso { Orden = 1, Nombre = "Transcribir audio" }, new WorkflowPaso { Orden = 2, Nombre = "Resumir" } }
            };
            var wf3 = new Workflow
            {
                Nombre = "Flujo privado de pruebas",
                Descripcion = "Solo para mí.",
                Visibilidad = "private",
                UsosCount = 2,
                FechaCreacion = ahora.AddDays(-1),
                Perfil = franklin,
                Pasos = { new WorkflowPaso { Orden = 1, Nombre = "Resumir" } }
            };
            db.Workflows.AddRange(wf1, wf2, wf3);

            db.Ejecuciones.AddRange(
                new Ejecucion { Perfil = franklin, Workflow = wf2, Estado = "completed", FechaInicio = ahora.AddHours(-3), DuracionMs = 4200 },
                new Ejecucion { Perfil = franklin, Workflow = wf1, Estado = "completed", FechaInicio = ahora.AddDays(-1), DuracionMs = 6100 },
                new Ejecucion { Perfil = franklin, Workflow = wf2, Estado = "failed", FechaInicio = ahora.AddDays(-2), DuracionMs = 1300 },
                new Ejecucion { Perfil = franklin, Workflow = wf1, Estado = "completed", FechaInicio = ahora.AddDays(-4), DuracionMs = 5800 },
                new Ejecucion { Perfil = luis, Workflow = wf1, Estado = "completed", FechaInicio = ahora.AddDays(-3), DuracionMs = 5500 }
            );

            db.SaveChanges();
        }
    }
}