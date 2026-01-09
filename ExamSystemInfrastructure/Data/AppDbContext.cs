using ExamSystemDomain.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemInfrastructure.Data
{
    using ExamSystemDomain.Entities;
    using Microsoft.EntityFrameworkCore;

    namespace ExamSystemInfrastructure.Data
    {
        public class AppDbContext : DbContext
        {
            public AppDbContext(DbContextOptions<AppDbContext> options)
                : base(options)
            {
            }

            // =========================
            // DbSet-lər (Tables)
            // =========================
            public DbSet<Student> Students { get; set; } = null!;
            public DbSet<Subject> Subjects { get; set; } = null!;
            public DbSet<Exam> Exams { get; set; } = null!;

            // =========================
            // Fluent API Configurations
            // =========================
            protected override void OnModelCreating(ModelBuilder modelBuilder)
            {
                base.OnModelCreating(modelBuilder);

                // -------------------------
                // Student
                // -------------------------
                modelBuilder.Entity<Student>()
                    .HasIndex(s => s.StudentNumber)
                    .IsUnique();

                // -------------------------
                // Subject
                // -------------------------
                modelBuilder.Entity<Subject>()
     .HasIndex(s => new { s.SubjectName, s.Grade })
     .IsUnique();


                // -------------------------
                // Exam
                // -------------------------
                modelBuilder.Entity<Exam>()
                    .HasOne(e => e.Student)
                    .WithMany(s => s.Exams)
                    .HasForeignKey(e => e.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                modelBuilder.Entity<Exam>()
                    .HasOne(e => e.Subject)
                    .WithMany(s => s.Exams)
                    .HasForeignKey(e => e.SubjectId)
                    .OnDelete(DeleteBehavior.Restrict);
            }
        }
    }

}
