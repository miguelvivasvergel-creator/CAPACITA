using CAPACITA.API.Models;
using System.ComponentModel.DataAnnotations;

namespace CAPACITA.API.Models
{
    public class Capacidad
    {
        [Key]
        public int IdCapacidad { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public string TipoEntrada { get; set; } = string.Empty;   // pdf, texto, imagen, audio, datos
        public string TipoSalida { get; set; } = string.Empty;
        public string Visibilidad { get; set; } = "private";       // public o private

        public int UsosCount { get; set; }
        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
        public int? PerfilId { get; set; }
        public Perfil? Perfil { get; set; }
        public ICollection<Permiso> Permisos { get; set; } = new List<Permiso>();
    }
}