using ExamSystemDomain.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

 

    namespace ExamSystemInfrastructure.Data
    {
        public class AppDbContext : DbContext
        {
            public AppDbContext(DbContextOptions<AppDbContext> options)
                : base(options)
            {
            }

           
            public DbSet<Student> Students { get; set; } = null!;
            public DbSet<Subject> Subjects { get; set; } = null!;
            public DbSet<Exam> Exams { get; set; } = null!;

         
            protected override void OnModelCreating(ModelBuilder modelBuilder)
            {
                base.OnModelCreating(modelBuilder);

              
                modelBuilder.Entity<Student>()
                    .HasIndex(s => s.StudentNumber)
                    .IsUnique();

                
                modelBuilder.Entity<Subject>()
               .HasIndex(s => new { s.SubjectName, s.Grade })
              .IsUnique();


               
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


