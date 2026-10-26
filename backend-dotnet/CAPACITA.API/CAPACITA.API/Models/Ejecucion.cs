using System.ComponentModel.DataAnnotations;

namespace CAPACITA.API.Models
{
    public class Ejecucion
    {
        [Key]
        public int IdEjecucion { get; set; }
        public string Estado { get; set; } = "completed";   // completed, running, failed
        public DateTime FechaInicio { get; set; } = DateTime.UtcNow;
        public int DuracionMs { get; set; }

        public int PerfilId { get; set; }
        public Perfil Perfil { get; set; } = null!;
        public int WorkflowId { get; set; }
        public Workflow Workflow { get; set; } = null!;
    }
} 