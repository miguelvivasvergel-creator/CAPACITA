using System.ComponentModel.DataAnnotations;

namespace CAPACITA.API.Models
{
    public class Perfil
    {
        [Key]
        public int IdPerfil { get; set; }
        public string Username { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int ClonesHechos { get; set; }

        public ICollection<Capacidad> Capacidades { get; set; } = new List<Capacidad>();
        public ICollection<Workflow> Workflows { get; set; } = new List<Workflow>();
        public ICollection<Ejecucion> Ejecuciones { get; set; } = new List<Ejecucion>();
    }
}