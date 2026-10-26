using System.Text.Json.Serialization;

namespace CAPACITA.API.DTO
{
    public class PerfilDTO
    {
        public string Username { get; set; } = "";
        public string DisplayName { get; set; } = "";
        public string Bio { get; set; } = "";
        public string? AvatarUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public PerfilStatsDTO Stats { get; set; } = new();
        public List<PerfilCapacidadDTO> Capabilities { get; set; } = new();
        public List<PerfilWorkflowDTO> Workflows { get; set; } = new();
        public List<ActividadDTO> Activity { get; set; } = new();
    }

    public class PerfilStatsDTO
    {
        public int PublicCapabilities { get; set; }
        public int PublicWorkflows { get; set; }
        public int Runs { get; set; }
        public int Clones { get; set; }
    }

    public class PerfilCapacidadDTO
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public string InputType { get; set; } = "";
        public string OutputType { get; set; } = "";
        public string Visibility { get; set; } = "";
        public int UsesCount { get; set; }
    }

    public class PerfilWorkflowDTO
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public List<string> Steps { get; set; } = new();
        public string Visibility { get; set; } = "";
        public int UsesCount { get; set; }
    }

    public class ActividadDTO
    {
        public string Id { get; set; } = "";
        public string WorkflowId { get; set; } = "";
        public string WorkflowName { get; set; } = "";
        public List<string> Steps { get; set; } = new();
        public string Status { get; set; } = "";
        public DateTime StartedAt { get; set; }
        public int DurationMs { get; set; }
    }
}