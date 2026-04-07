using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicBookingSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class addmedicalrecord : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "VisitId1",
                table: "Results",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Results_VisitId1",
                table: "Results",
                column: "VisitId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Results_Visits_VisitId1",
                table: "Results",
                column: "VisitId1",
                principalTable: "Visits",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Results_Visits_VisitId1",
                table: "Results");

            migrationBuilder.DropIndex(
                name: "IX_Results_VisitId1",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "VisitId1",
                table: "Results");
        }
    }
}
