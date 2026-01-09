using ExamSystemApplication.Interfaces.Repositories;
using ExamSystemDomain.Entities;
using ExamSystemDomain.Enums;
using ExamSystemInfrastructure.Data;

using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemInfrastructure.Repositories
{
    public class SubjectRepository : ISubjectRepository
    {
        private readonly AppDbContext _context;

        public SubjectRepository(AppDbContext context)
        {
            _context = context;
        }

        
        public async Task AddAsync(Subject subject)
        {
            await _context.Subjects.AddAsync(subject);
            await _context.SaveChangesAsync();
        }

      
        public async Task<Subject?> GetByIdAsync(int id)
        {
            return await _context.Subjects
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<Subject?> GetByCodeAsync(string subjectCode)
        {
            return await _context.Subjects
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SubjectCode == subjectCode);
        }

        public async Task<IReadOnlyList<Subject>> GetAllAsync()
        {
            return await _context.Subjects
                .AsNoTracking()
                .OrderBy(s => s.Grade)
                .ThenBy(s => s.SubjectName)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Subject>> GetByGradeAsync(Grade grade)
        {
            return await _context.Subjects
                .AsNoTracking()
                .Where(s => s.Grade == grade)
                .OrderBy(s => s.SubjectName)
                .ToListAsync();
        }

       
        public async Task UpdateAsync(Subject subject)
        {
            _context.Entry(subject).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        
        public async Task DeleteAsync(Subject subject)
        {
            _context.Subjects.Remove(subject);
            await _context.SaveChangesAsync();
        }
       

    }
}

