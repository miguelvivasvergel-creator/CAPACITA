using CAPACITA.API.Data;
using CAPACITA.API.DTO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CAPACITA.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BuscarController : ControllerBase
    {
        private readonly AppDbContext _context;
        public BuscarController(AppDbContext context) { _context = context; }

        // GET api/buscar?q=pdf&limit=5  -> usuarios, capacidades y workflows PÚBLICOS
        [HttpGet]
        public async Task<ActionResult<BusquedaDTO>> Get([FromQuery] string? q, [FromQuery] int limit = 5)
        {
            q = q?.Trim();
            if (string.IsNullOrEmpty(q) || q.Length < 2) return Ok(new BusquedaDTO());
            limit = Math.Clamp(limit, 1, 30);

            var usuarios = await _context.Perfiles
                .Where(p => p.Username.Contains(q) || p.DisplayName.Contains(q))
                .OrderBy(p => p.DisplayName).Take(limit)
                .Select(p => new PerfilResumenDTO
                {
                    Username = p.Username,
                    DisplayName = p.DisplayName,
                    Bio = p.Bio,
                    AvatarUrl = p.AvatarUrl,
                    PublicCapabilities = p.Capacidades.Count(c => c.Visibilidad == "public"),
                    PublicWorkflows = p.Workflows.Count(w => w.Visibilidad == "public")
                }).ToListAsync();

            var caps = await _context.Capacidades
                .Where(c => c.Visibilidad == "public" && c.Perfil != null
                         && (c.Nombre.Contains(q) || c.Descripcion.Contains(q)))
                .OrderByDescending(c => c.UsosCount).Take(limit)
                .Select(c => new { c.IdCapacidad, c.Nombre, c.Descripcion, Owner = c.Perfil!.Username })
                .ToListAsync();

            var wfs = await _context.Workflows
                .Where(w => w.Visibilidad == "public"
                         && (w.Nombre.Contains(q) || w.Descripcion.Contains(q)))
                .OrderByDescending(w => w.UsosCount).Take(limit)
                .Select(w => new { w.IdWorkflow, w.Nombre, w.Descripcion, Owner = w.Perfil.Username })
                .ToListAsync();

            return Ok(new BusquedaDTO
            {
                Usuarios = usuarios,
                Capacidades = caps.Select(c => new BusquedaItemDTO
                { Id = $"cap-{c.IdCapacidad}", Name = c.Nombre, Description = c.Descripcion, OwnerUsername = c.Owner }).ToList(),
                Workflows = wfs.Select(w => new BusquedaItemDTO
                { Id = $"wf-{w.IdWorkflow}", Name = w.Nombre, Description = w.Descripcion, OwnerUsername = w.Owner }).ToList()
            });
        }
    }
}