using CAPACITA.API.Data;
using CAPACITA.API.DTO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CAPACITA.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PerfilesController : ControllerBase
    {
        private readonly AppDbContext _context;
        public PerfilesController(AppDbContext context) { _context = context; }

        // GET api/perfiles?q=fra&limit=8  -> buscador de usuarios
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PerfilResumenDTO>>> Buscar(
            [FromQuery] string? q, [FromQuery] int limit = 8)
        {
            q = q?.Trim();
            if (string.IsNullOrEmpty(q) || q.Length < 2)
                return Ok(new List<PerfilResumenDTO>());

            limit = Math.Clamp(limit, 1, 20);

            var resultado = await _context.Perfiles
                .Where(p => p.Username.Contains(q) || p.DisplayName.Contains(q))
                .OrderBy(p => p.DisplayName)
                .Take(limit)
                .Select(p => new PerfilResumenDTO
                {
                    Username = p.Username,
                    DisplayName = p.DisplayName,
                    Bio = p.Bio,
                    AvatarUrl = p.AvatarUrl,
                    PublicCapabilities = p.Capacidades.Count(c => c.Visibilidad == "public"),
                    PublicWorkflows = p.Workflows.Count(w => w.Visibilidad == "public")
                })
                .ToListAsync();

            return Ok(resultado);
        }

        // GET api/perfiles/franklin_dev
        [HttpGet("{username}")]
        public async Task<ActionResult<PerfilDTO>> Get(string username)
        {
            var perfil = await _context.Perfiles.FirstOrDefaultAsync(p => p.Username == username);
            if (perfil == null) return NotFound();

            var caps = await _context.Capacidades
                .Where(c => c.PerfilId == perfil.IdPerfil && c.Visibilidad == "public").ToListAsync();
            var wfs = await _context.Workflows.Include(w => w.Pasos)
                .Where(w => w.PerfilId == perfil.IdPerfil && w.Visibilidad == "public").ToListAsync();

            var wfIds = wfs.Select(w => w.IdWorkflow).ToList();
            var ejecs = await _context.Ejecuciones
                .Where(e => e.PerfilId == perfil.IdPerfil && wfIds.Contains(e.WorkflowId))
                .OrderByDescending(e => e.FechaInicio).Take(10).ToListAsync();

            var dto = new PerfilDTO
            {
                Username = perfil.Username,
                DisplayName = perfil.DisplayName,
                Bio = perfil.Bio,
                AvatarUrl = perfil.AvatarUrl,
                CreatedAt = perfil.CreatedAt,
                Stats = new PerfilStatsDTO
                {
                    PublicCapabilities = caps.Count,
                    PublicWorkflows = wfs.Count,
                    Runs = await _context.Ejecuciones.CountAsync(e => e.PerfilId == perfil.IdPerfil),
                    Clones = perfil.ClonesHechos
                },
                Capabilities = caps.Select(c => new PerfilCapacidadDTO
                {
                    Id = $"cap-{c.IdCapacidad}",
                    Name = c.Nombre,
                    Description = c.Descripcion,
                    InputType = c.TipoEntrada,
                    OutputType = c.TipoSalida,
                    Visibility = c.Visibilidad,
                    UsesCount = c.UsosCount
                }).ToList(),
                Workflows = wfs.Select(w => new PerfilWorkflowDTO
                {
                    Id = $"wf-{w.IdWorkflow}",
                    Name = w.Nombre,
                    Description = w.Descripcion,
                    Steps = w.Pasos.OrderBy(p => p.Orden).Select(p => p.Nombre).ToList(),
                    Visibility = w.Visibilidad,
                    UsesCount = w.UsosCount
                }).ToList(),
                Activity = ejecs.Select(e =>
                {
                    var w = wfs.First(x => x.IdWorkflow == e.WorkflowId);
                    return new ActividadDTO
                    {
                        Id = $"run-{e.IdEjecucion}",
                        WorkflowId = $"wf-{w.IdWorkflow}",
                        WorkflowName = w.Nombre,
                        Steps = w.Pasos.OrderBy(p => p.Orden).Select(p => p.Nombre).ToList(),
                        Status = e.Estado,
                        StartedAt = e.FechaInicio,
                        DurationMs = e.DuracionMs
                    };
                }).ToList()
            };

            return Ok(dto);
        }
    }
}
