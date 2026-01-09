using ExamSystemApplication.Interfaces.Repositories;
using ExamSystemDomain.Entities;
using ExamSystemInfrastructure.Data;

using Microsoft.EntityFrameworkCore;

namespace ExamSystemInfrastructure.Repositories
{
    public class ExamRepository : IExamRepository
    {
        private readonly AppDbContext _context;

        public ExamRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(Exam exam)
        {
            await _context.Exams.AddAsync(exam);
            await _context.SaveChangesAsync();
        }

        public async Task<Exam?> GetByIdAsync(int id)
        {
            return await _context.Exams
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == id);
        }

        public async Task<IReadOnlyList<Exam>> GetAllAsync()
        {
            return await _context.Exams
                .AsNoTracking()
                .OrderByDescending(e => e.ExamDate)
                .ToListAsync();
        }
        public async Task<IReadOnlyList<Exam>> GetByStudentIdAsync(int studentId)
        {
            return await _context.Exams
                .AsNoTracking()
                .Include(e => e.Student)
                .Include(e => e.Subject)
                .Where(e => e.StudentId == studentId)
                .OrderByDescending(e => e.ExamDate)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Exam>> GetBySubjectIdAsync(int subjectId)
        {
            return await _context.Exams
                .AsNoTracking()
                .Include(e => e.Student)
                .Include(e => e.Subject)
                .Where(e => e.SubjectId == subjectId)
                .OrderByDescending(e => e.ExamDate)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Exam>> GetAllWithDetailsAsync()
        {
            return await _context.Exams
                .AsNoTracking()
                .Include(e => e.Student)
                .Include(e => e.Subject)
                .OrderByDescending(e => e.ExamDate)
                .ToListAsync();
        }

        public async Task<bool> ExistsSameDayAsync(
            int studentId,
            int subjectId,
            DateTime examDate,
            int excludeExamId)
        {
            var dayStart = examDate.Date;
            var dayEnd = dayStart.AddDays(1);

            return await _context.Exams
                .AsNoTracking()
                .AnyAsync(e =>
                    e.Id != excludeExamId &&
                    e.StudentId == studentId &&
                    e.SubjectId == subjectId &&
                    e.ExamDate >= dayStart &&
                    e.ExamDate < dayEnd);
        }

        public async Task UpdateAsync(Exam exam)
        {
            _context.Exams.Update(exam);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Exam exam)
        {
            _context.Exams.Remove(exam);
            await _context.SaveChangesAsync();
        }
        public async Task<bool> HasExamsAsync(int subjectId)
        {
            return await _context.Exams
                .AnyAsync(e => e.SubjectId == subjectId);
        }

    }
}
