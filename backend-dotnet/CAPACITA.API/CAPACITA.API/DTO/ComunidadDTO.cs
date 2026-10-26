using System.Text.Json.Serialization;

namespace CAPACITA.API.DTO
{
    public class ComunidadItemDTO
    {
        public string Id { get; set; } = "";
        public string Tipo { get; set; } = "";            // capacidad o workflow
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? InputType { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? OutputType { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<string>? Pasos { get; set; }
        public int UsesCount { get; set; }
        public string OwnerName { get; set; } = "";
        public string OwnerUsername { get; set; } = "";
        public DateTime CreatedAt { get; set; }
    }

    public class CreadorDTO
    {
        public string Username { get; set; } = "";
        public string Nombre { get; set; } = "";
        public int Usos { get; set; }
    }

    public class PopularDTO
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public int UsesCount { get; set; }
    }
}