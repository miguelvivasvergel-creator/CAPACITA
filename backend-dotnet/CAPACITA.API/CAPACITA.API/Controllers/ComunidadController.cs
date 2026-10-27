using CAPACITA.API.Data;
using CAPACITA.API.DTO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CAPACITA.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ComunidadController : ControllerBase
    {
        private readonly AppDbContext _context;
        public ComunidadController(AppDbContext context) { _context = context; }

        // GET api/comunidad  -> solo contenido público
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ComunidadItemDTO>>> Get()
        {
            var caps = await _context.Capacidades.Include(c => c.Perfil)
                .Where(c => c.Visibilidad == "public" && c.Perfil != null).ToListAsync();
            var wfs = await _context.Workflows.Include(w => w.Perfil).Include(w => w.Pasos)
                .Where(w => w.Visibilidad == "public").ToListAsync();

            var items = caps.Select(c => new ComunidadItemDTO
            {
                Id = $"cap-{c.IdCapacidad}",
                Tipo = "capacidad",
                Name = c.Nombre,
                Description = c.Descripcion,
                InputType = c.TipoEntrada,
                OutputType = c.TipoSalida,
                UsesCount = c.UsosCount,
                OwnerName = c.Perfil!.DisplayName,
                OwnerUsername = c.Perfil.Username,
                CreatedAt = c.FechaCreacion
            }).Concat(wfs.Select(w => new ComunidadItemDTO
            {
                Id = $"wf-{w.IdWorkflow}",
                Tipo = "workflow",
                Name = w.Nombre,
                Description = w.Descripcion,
                Pasos = w.Pasos.OrderBy(p => p.Orden).Select(p => p.Nombre).ToList(),
                UsesCount = w.UsosCount,
                OwnerName = w.Perfil.DisplayName,
                OwnerUsername = w.Perfil.Username,
                CreatedAt = w.FechaCreacion
            }));

            return Ok(items.OrderByDescending(i => i.CreatedAt).ToList());
        }

        // GET api/comunidad/creadores
        [HttpGet("creadores")]
        public async Task<ActionResult<IEnumerable<CreadorDTO>>> Creadores()
        {
            var caps = await _context.Capacidades.Include(c => c.Perfil)
                .Where(c => c.Visibilidad == "public" && c.Perfil != null).ToListAsync();
            var wfs = await _context.Workflows.Include(w => w.Perfil)
                .Where(w => w.Visibilidad == "public").ToListAsync();

            var pares = caps.Select(c => (c.Perfil!, c.UsosCount))
                .Concat(wfs.Select(w => (w.Perfil, w.UsosCount)));

            var creadores = pares.GroupBy(p => p.Item1.Username)
                .Select(g => new CreadorDTO
                {
                    Username = g.Key,
                    Nombre = g.First().Item1.DisplayName,
                    Usos = g.Sum(x => x.Item2)
                })
                .OrderByDescending(c => c.Usos).Take(5).ToList();

            return Ok(creadores);
        }

        // GET api/comunidad/populares
        [HttpGet("populares")]
        public async Task<ActionResult<IEnumerable<PopularDTO>>> Populares()
        {
            var caps = await _context.Capacidades
                .Where(c => c.Visibilidad == "public" && c.PerfilId != null).ToListAsync();
            var wfs = await _context.Workflows
                .Where(w => w.Visibilidad == "public").ToListAsync();

            var populares = caps.Select(c => new PopularDTO { Id = $"cap-{c.IdCapacidad}", Name = c.Nombre, UsesCount = c.UsosCount })
                .Concat(wfs.Select(w => new PopularDTO { Id = $"wf-{w.IdWorkflow}", Name = w.Nombre, UsesCount = w.UsosCount }))
                .OrderByDescending(p => p.UsesCount).Take(5).ToList();

            return Ok(populares);
        }
    }
}