using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicBookingSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class updateLocalExamination : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.AddColumn<string>(
                name: "ImageData",
                table: "Results",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Results",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageData",
                table: "ImagingOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "ImagingOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cns_Consciousness",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cns_MotorPower",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cns_Reflexes",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cns_Sensation",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cvs_Edema",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cvs_HeartSounds",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cvs_Murmurs",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cvs_Pulse",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Git_Auscultation",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Git_Inspection",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Git_Palpation",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Git_Percussion",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Msk_Deformity",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Msk_Rom",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Msk_Swelling",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Msk_Tenderness",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Resp_Auscultation",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Resp_Inspection",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Resp_Palpation",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Resp_Percussion",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Skin_Infection",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Skin_Pigmentation",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Skin_Rash",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Skin_Ulcers",
                table: "Examinations",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageData",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "ImageData",
                table: "ImagingOrders");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "ImagingOrders");

            migrationBuilder.DropColumn(
                name: "Cns_Consciousness",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Cns_MotorPower",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Cns_Reflexes",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Cns_Sensation",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Cvs_Edema",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Cvs_HeartSounds",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Cvs_Murmurs",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Cvs_Pulse",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Git_Auscultation",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Git_Inspection",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Git_Palpation",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Git_Percussion",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Msk_Deformity",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Msk_Rom",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Msk_Swelling",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Msk_Tenderness",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Resp_Auscultation",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Resp_Inspection",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Resp_Palpation",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Resp_Percussion",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Skin_Infection",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Skin_Pigmentation",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Skin_Rash",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Skin_Ulcers",
                table: "Examinations");

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
    }
}
