using System.ComponentModel.DataAnnotations;

namespace CAPACITA.API.DTO
{
    public class CapacidadListaDTO
    {
        public int IdCapacidad { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string TipoEntrada { get; set; } = string.Empty;
        public string TipoSalida { get; set; } = string.Empty;
        public string Visibilidad { get; set; } = string.Empty;
        public int TotalPermisos { get; set; }
    }

    // Para el detalle: incluye los permisos
    public class CapacidadDTO
    {
        public int IdCapacidad { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public string TipoEntrada { get; set; } = string.Empty;
        public string TipoSalida { get; set; } = string.Empty;
        public string Visibilidad { get; set; } = string.Empty;
        public List<PermisoDTO> Permisos { get; set; } = new();
    }

    // Para crear (POST)
    public class CapacidadCreateDTO
    {
        [Required, StringLength(80)]
        public string Nombre { get; set; } = string.Empty;

        [Required, StringLength(500)]
        public string Descripcion { get; set; } = string.Empty;

        [Required, RegularExpression("^(pdf|texto|imagen|audio|datos)$",
            ErrorMessage = "Debe ser pdf, texto, imagen, audio o datos.")]
        public string TipoEntrada { get; set; } = string.Empty;

        [Required, RegularExpression("^(pdf|texto|imagen|audio|datos)$",
            ErrorMessage = "Debe ser pdf, texto, imagen, audio o datos.")]
        public string TipoSalida { get; set; } = string.Empty;

        [Required, RegularExpression("^(public|private)$",
            ErrorMessage = "Debe ser public o private.")]
        public string Visibilidad { get; set; } = "private";

        public List<string> Permisos { get; set; } = new();
    }

    // Para editar (PUT): los mismos campos, sin permisos
    public class CapacidadUpdateDTO
    {
        [Required, StringLength(80)]
        public string Nombre { get; set; } = string.Empty;

        [Required, StringLength(500)]
        public string Descripcion { get; set; } = string.Empty;

        [Required, RegularExpression("^(pdf|texto|imagen|audio|datos)$",
            ErrorMessage = "Debe ser pdf, texto, imagen, audio o datos.")]
        public string TipoEntrada { get; set; } = string.Empty;

        [Required, RegularExpression("^(pdf|texto|imagen|audio|datos)$",
            ErrorMessage = "Debe ser pdf, texto, imagen, audio o datos.")]
        public string TipoSalida { get; set; } = string.Empty;

        [Required, RegularExpression("^(public|private)$",
            ErrorMessage = "Debe ser public o private.")]
        public string Visibilidad { get; set; } = "private";
    }
}
