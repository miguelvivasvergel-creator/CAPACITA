using CAPACITA.API.Data;
using CAPACITA.API.DTO;

using CAPACITA.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
    
namespace CAPACITA.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CapacidadesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CapacidadesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Capacidades
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CapacidadListaDTO>>> GetCapacidades()
        {
            return await _context.Capacidades
                .Select(c => new CapacidadListaDTO
                {
                    IdCapacidad = c.IdCapacidad,
                    Nombre = c.Nombre,
                    TipoEntrada = c.TipoEntrada,
                    TipoSalida = c.TipoSalida,
                    Visibilidad = c.Visibilidad,
                    TotalPermisos = c.Permisos.Count()
                })
                .ToListAsync();
        }

        // GET: api/Capacidades/5
        [HttpGet("{id}")]
        public async Task<ActionResult<CapacidadDTO>> GetCapacidad(int id)
        {
            var capacidad = await _context.Capacidades
                .Include(c => c.Permisos)
                .FirstOrDefaultAsync(c => c.IdCapacidad == id);

            if (capacidad == null)
            {
                return NotFound();
            }

            return ToDTO(capacidad);
        }

        // POST: api/Capacidades
        [HttpPost]
        public async Task<ActionResult<CapacidadDTO>> PostCapacidad(CapacidadCreateDTO dto)
        {
            var capacidad = new Capacidad
            {
                Nombre = dto.Nombre,
                PerfilId = dto.PerfilId,
                Descripcion = dto.Descripcion,
                TipoEntrada = dto.TipoEntrada,
                TipoSalida = dto.TipoSalida,
                Visibilidad = dto.Visibilidad,
                Permisos = dto.Permisos
                    .Where(p => !string.IsNullOrWhiteSpace(p))
                    .Select(p => new Permiso { Descripcion = p.Trim() })
                    .ToList()
            };

            _context.Capacidades.Add(capacidad);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCapacidad),
                new { id = capacidad.IdCapacidad }, ToDTO(capacidad));
        }

        // PUT: api/Capacidades/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCapacidad(int id, CapacidadUpdateDTO dto)
        {
            var capacidad = await _context.Capacidades.FindAsync(id);
            if (capacidad == null)
            {
                return NotFound();
            }

            capacidad.Nombre = dto.Nombre;
            capacidad.Descripcion = dto.Descripcion;
            capacidad.TipoEntrada = dto.TipoEntrada;
            capacidad.TipoSalida = dto.TipoSalida;
            capacidad.Visibilidad = dto.Visibilidad;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Capacidades/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCapacidad(int id)
        {
            var capacidad = await _context.Capacidades.FindAsync(id);
            if (capacidad == null)
            {
                return NotFound();
            }

            _context.Capacidades.Remove(capacidad);   // sus permisos se borran en cascada
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static CapacidadDTO ToDTO(Capacidad c) => new CapacidadDTO
        {
            IdCapacidad = c.IdCapacidad,
            Nombre = c.Nombre,
            Descripcion = c.Descripcion,
            TipoEntrada = c.TipoEntrada,
            TipoSalida = c.TipoSalida,
            Visibilidad = c.Visibilidad,
            Permisos = c.Permisos
                .Select(p => new PermisoDTO { IdPermiso = p.IdPermiso, Descripcion = p.Descripcion })
                .ToList()
        };
    }
}