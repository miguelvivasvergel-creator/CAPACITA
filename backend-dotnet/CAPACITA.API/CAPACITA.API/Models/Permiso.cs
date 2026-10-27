using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CAPACITA.API.Models
{
    public class Permiso
    {
        [Key]
        public int IdPermiso { get; set; }
        public string Descripcion { get; set; } = string.Empty;
        [ForeignKey("Capacidad")]
        public int CapacidadId { get; set; }
        public Capacidad Capacidad { get; set; } = null!;
    }
}