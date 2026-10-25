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
    }
}
