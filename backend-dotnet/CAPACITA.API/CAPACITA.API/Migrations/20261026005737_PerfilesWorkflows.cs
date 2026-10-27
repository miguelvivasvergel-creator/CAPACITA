using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CAPACITA.API.Migrations
{
    /// <inheritdoc />
    public partial class PerfilesWorkflows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FechaCreacion",
                table: "Capacidades",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "PerfilId",
                table: "Capacidades",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UsosCount",
                table: "Capacidades",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Perfiles",
                columns: table => new
                {
                    IdPerfil = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Username = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Bio = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AvatarUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClonesHechos = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Perfiles", x => x.IdPerfil);
                });

            migrationBuilder.CreateTable(
                name: "Workflows",
                columns: table => new
                {
                    IdWorkflow = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Descripcion = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Visibilidad = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UsosCount = table.Column<int>(type: "int", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PerfilId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Workflows", x => x.IdWorkflow);
                    table.ForeignKey(
                        name: "FK_Workflows_Perfiles_PerfilId",
                        column: x => x.PerfilId,
                        principalTable: "Perfiles",
                        principalColumn: "IdPerfil",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Ejecuciones",
                columns: table => new
                {
                    IdEjecucion = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Estado = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FechaInicio = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DuracionMs = table.Column<int>(type: "int", nullable: false),
                    PerfilId = table.Column<int>(type: "int", nullable: false),
                    WorkflowId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ejecuciones", x => x.IdEjecucion);
                    table.ForeignKey(
                        name: "FK_Ejecuciones_Perfiles_PerfilId",
                        column: x => x.PerfilId,
                        principalTable: "Perfiles",
                        principalColumn: "IdPerfil",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Ejecuciones_Workflows_WorkflowId",
                        column: x => x.WorkflowId,
                        principalTable: "Workflows",
                        principalColumn: "IdWorkflow");
                });

            migrationBuilder.CreateTable(
                name: "WorkflowPasos",
                columns: table => new
                {
                    IdPaso = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Orden = table.Column<int>(type: "int", nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    WorkflowId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowPasos", x => x.IdPaso);
                    table.ForeignKey(
                        name: "FK_WorkflowPasos_Workflows_WorkflowId",
                        column: x => x.WorkflowId,
                        principalTable: "Workflows",
                        principalColumn: "IdWorkflow",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Capacidades_PerfilId",
                table: "Capacidades",
                column: "PerfilId");

            migrationBuilder.CreateIndex(
                name: "IX_Ejecuciones_PerfilId",
                table: "Ejecuciones",
                column: "PerfilId");

            migrationBuilder.CreateIndex(
                name: "IX_Ejecuciones_WorkflowId",
                table: "Ejecuciones",
                column: "WorkflowId");

            migrationBuilder.CreateIndex(
                name: "IX_Perfiles_Username",
                table: "Perfiles",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowPasos_WorkflowId",
                table: "WorkflowPasos",
                column: "WorkflowId");

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_PerfilId",
                table: "Workflows",
                column: "PerfilId");

            migrationBuilder.AddForeignKey(
                name: "FK_Capacidades_Perfiles_PerfilId",
                table: "Capacidades",
                column: "PerfilId",
                principalTable: "Perfiles",
                principalColumn: "IdPerfil",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Capacidades_Perfiles_PerfilId",
                table: "Capacidades");

            migrationBuilder.DropTable(
                name: "Ejecuciones");

            migrationBuilder.DropTable(
                name: "WorkflowPasos");

            migrationBuilder.DropTable(
                name: "Workflows");

            migrationBuilder.DropTable(
                name: "Perfiles");

            migrationBuilder.DropIndex(
                name: "IX_Capacidades_PerfilId",
                table: "Capacidades");

            migrationBuilder.DropColumn(
                name: "FechaCreacion",
                table: "Capacidades");

            migrationBuilder.DropColumn(
                name: "PerfilId",
                table: "Capacidades");

            migrationBuilder.DropColumn(
                name: "UsosCount",
                table: "Capacidades");
        }
    }
}
