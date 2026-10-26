using System.ComponentModel.DataAnnotations;

namespace CAPACITA.API.Models
{
    public class Workflow
    {
        [Key]
        public int IdWorkflow { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public string Visibilidad { get; set; } = "private";   // public o private
        public int UsosCount { get; set; }
        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public int PerfilId { get; set; }
        public Perfil Perfil { get; set; } = null!;

        public ICollection<WorkflowPaso> Pasos { get; set; } = new List<WorkflowPaso>();
    }

    public class WorkflowPaso
    {
        [Key]
        public int IdPaso { get; set; }
        public int Orden { get; set; }
        public string Nombre { get; set; } = string.Empty;

        public int WorkflowId { get; set; }
        public Workflow Workflow { get; set; } = null!;
    }
}