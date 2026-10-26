using CAPACITA.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CAPACITA.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Capacidad> Capacidades { get; set; }
        public DbSet<Permiso> Permisos { get; set; }
        public DbSet<Perfil> Perfiles { get; set; }
        public DbSet<Workflow> Workflows { get; set; }
        public DbSet<WorkflowPaso> WorkflowPasos { get; set; }
        public DbSet<Ejecucion> Ejecuciones { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Perfil>()
                .HasIndex(p => p.Username).IsUnique();

            // Si borras un perfil, sus capacidades quedan sin dueño (no se borran)
            modelBuilder.Entity<Capacidad>()
                .HasOne(c => c.Perfil).WithMany(p => p.Capacidades)
                .HasForeignKey(c => c.PerfilId)
                .OnDelete(DeleteBehavior.SetNull);

            // Evita el error "multiple cascade paths" de SQL Server
            modelBuilder.Entity<Ejecucion>()
                .HasOne(e => e.Workflow).WithMany()
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}