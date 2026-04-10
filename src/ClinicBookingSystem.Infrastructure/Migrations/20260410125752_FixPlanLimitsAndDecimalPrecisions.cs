using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicBookingSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixPlanLimitsAndDecimalPrecisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentTransactions_ClinicSubscriptions_SubscriptionId",
                table: "PaymentTransactions");

            migrationBuilder.AlterColumn<decimal>(
                name: "BMI",
                table: "Vitals",
                type: "decimal(5,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ClinicSubscriptionId",
                table: "PaymentTransactions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_ClinicSubscriptionId",
                table: "PaymentTransactions",
                column: "ClinicSubscriptionId");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentTransactions_ClinicSubscriptions_ClinicSubscriptionId",
                table: "PaymentTransactions",
                column: "ClinicSubscriptionId",
                principalTable: "ClinicSubscriptions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentTransactions_ClinicSubscriptions_SubscriptionId",
                table: "PaymentTransactions",
                column: "SubscriptionId",
                principalTable: "ClinicSubscriptions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Manual additions for Plans
            migrationBuilder.AddColumn<int>(
                name: "MaxBookings",
                table: "Plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxDoctors",
                table: "Plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxPatients",
                table: "Plans",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(@"
            UPDATE p
            SET
                MaxDoctors = pf.LimitValue
            FROM Plans p
            INNER JOIN PlanFeature pf ON p.Id = pf.PlanId
            INNER JOIN Features f ON pf.FeatureId = f.Id
            WHERE f.Code = 'MaxDoctors';

            UPDATE p
            SET
                MaxPatients = pf.LimitValue
            FROM Plans p
            INNER JOIN PlanFeature pf ON p.Id = pf.PlanId
            INNER JOIN Features f ON pf.FeatureId = f.Id
            WHERE f.Code = 'MaxPatients';

            UPDATE p
            SET
                MaxBookings = pf.LimitValue
            FROM Plans p
            INNER JOIN PlanFeature pf ON p.Id = pf.PlanId
            INNER JOIN Features f ON pf.FeatureId = f.Id
            WHERE f.Code = 'MaxBookings';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentTransactions_ClinicSubscriptions_ClinicSubscriptionId",
                table: "PaymentTransactions");

            migrationBuilder.DropForeignKey(
                name: "FK_PaymentTransactions_ClinicSubscriptions_SubscriptionId",
                table: "PaymentTransactions");

            migrationBuilder.DropIndex(
                name: "IX_PaymentTransactions_ClinicSubscriptionId",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "ClinicSubscriptionId",
                table: "PaymentTransactions");

            migrationBuilder.AlterColumn<decimal>(
                name: "BMI",
                table: "Vitals",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentTransactions_ClinicSubscriptions_SubscriptionId",
                table: "PaymentTransactions",
                column: "SubscriptionId",
                principalTable: "ClinicSubscriptions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.DropColumn(
                name: "MaxBookings",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "MaxDoctors",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "MaxPatients",
                table: "Plans");
        }
    }
}
