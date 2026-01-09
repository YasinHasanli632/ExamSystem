using ExamSystemApplication.Interfaces.Repositories;
using ExamSystemDomain.Entities;
using ExamSystemInfrastructure.Data;

using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemInfrastructure.Repositories
{
    public class StudentRepository : IStudentRepository
    {
        private readonly AppDbContext _context;

        public StudentRepository(AppDbContext context)
        {
            _context = context;
        }

       
        public async Task AddAsync(Student student)
        {
            await _context.Students.AddAsync(student);
            await _context.SaveChangesAsync();
        }

       
        public async Task<Student?> GetByIdAsync(int id)
        {
            return await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<Student?> GetByStudentNumberAsync(int studentNumber)
        {
            return await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.StudentNumber == studentNumber);
        }

        public async Task<IReadOnlyList<Student>> GetAllAsync()
        {
            return await _context.Students
                .AsNoTracking()
                .OrderBy(s => s.LastName)
                .ThenBy(s => s.FirstName)
                .ToListAsync();
        }

        public async Task<int> GetNextStudentSequenceAsync()
        {
            var lastNumber = await _context.Students
                .AsNoTracking()
                .Select(s => s.StudentNumber)
                .OrderByDescending(n => n)
                .FirstOrDefaultAsync();

            return lastNumber + 1;
        }

        
        public async Task UpdateAsync(Student student)
        {
            _context.Students.Update(student);
            await _context.SaveChangesAsync();
        }

        
        public async Task DeleteAsync(Student student)
        {
            _context.Students.Remove(student);
            await _context.SaveChangesAsync();
        }
    }
}