using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicBookingSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RefineMedicalEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ResultText",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "DurationDays",
                table: "Prescriptions");

            migrationBuilder.RenameColumn(
                name: "Frequency",
                table: "Prescriptions",
                newName: "Duration");

            migrationBuilder.AddColumn<decimal>(
                name: "PO2",
                table: "Vitals",
                type: "decimal(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RBS",
                table: "Vitals",
                type: "decimal(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImagingResult",
                table: "Results",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LabResult",
                table: "Results",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OtherResult",
                table: "Results",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Instructions",
                table: "Prescriptions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Examinations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VisitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GeneralExamination = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    LocalExamination = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    PhysicalNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Examinations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Examinations_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Examinations_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_TenantId",
                table: "Examinations",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_VisitId",
                table: "Examinations",
                column: "VisitId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Examinations");

            migrationBuilder.DropColumn(
                name: "PO2",
                table: "Vitals");

            migrationBuilder.DropColumn(
                name: "RBS",
                table: "Vitals");

            migrationBuilder.DropColumn(
                name: "ImagingResult",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "LabResult",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "OtherResult",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "Instructions",
                table: "Prescriptions");

            migrationBuilder.RenameColumn(
                name: "Duration",
                table: "Prescriptions",
                newName: "Frequency");

            migrationBuilder.AddColumn<string>(
                name: "ResultText",
                table: "Results",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "DurationDays",
                table: "Prescriptions",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
