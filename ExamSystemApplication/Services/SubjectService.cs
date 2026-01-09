using ExamSystemApplication.Interfaces.Repositories;
using ExamSystemApplication.Interfaces.Services;
using ExamSystemDomain.Entities;
using ExamSystemDomain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemApplication.Services
{
    public class SubjectService : ISubjectService
    {
        private readonly ISubjectRepository _subjectRepository;
        private readonly IExamRepository _examRepository;
        public SubjectService(ISubjectRepository subjectRepository,IExamRepository examRepository)
        {
            _examRepository = examRepository;
            _subjectRepository = subjectRepository;
        }

     
        public async Task<Subject> CreateAsync(Subject subject)
        {
           
            if (!Enum.IsDefined(typeof(Grade), subject.Grade))
                throw new InvalidOperationException("Sinif 1 ilə 11 arasında olmalıdır.");

          
            var subjects = await _subjectRepository.GetAllAsync();

            foreach (var s in subjects)
            {
                if (s.SubjectName.Equals(subject.SubjectName, StringComparison.OrdinalIgnoreCase)
                    && s.Grade == subject.Grade)
                {
                    throw new InvalidOperationException(
                        "Bu sinif üçün bu adda fənn artıq mövcuddur.");
                }
            }

           
            var words = subject.SubjectName
                .Trim()
                .ToUpper()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries);

            string shortName;

            if (words.Length == 1)
                shortName = words[0].Substring(0, Math.Min(3, words[0].Length));
            else
                shortName = string.Concat(words.Select(w => w[0]));

          
            subject.SubjectCode = shortName;

            await _subjectRepository.AddAsync(subject);

            return subject;
        }



      
        public async Task<Subject> GetByIdAsync(int id)
        {
            var subject = await _subjectRepository.GetByIdAsync(id);

            if (subject == null)
                throw new KeyNotFoundException("Dərs tapılmadı.");

            return subject;
        }

        public async Task<Subject> GetByCodeAsync(string subjectCode)
        {
            var subject = await _subjectRepository.GetByCodeAsync(subjectCode);

            if (subject == null)
                throw new KeyNotFoundException("Dərs tapılmadı.");

            return subject;
        }

        public async Task<IReadOnlyList<Subject>> GetAllAsync()
        {
            return await _subjectRepository.GetAllAsync();
        }
       

        public async Task<IReadOnlyList<Subject>> GetByGradeAsync(Grade grade)
        {
            if (!Enum.IsDefined(typeof(Grade), grade))
                throw new InvalidOperationException("Yanlış sinif.");

            return await _subjectRepository.GetByGradeAsync(grade);
        }

       
        public async Task UpdateAsync(Subject subject)
        {

            if (!Enum.IsDefined(typeof(Grade), subject.Grade))
                throw new InvalidOperationException("Sinif 1 ilə 11 arasında olmalıdır.");
            var existingSubject =
                await _subjectRepository.GetByIdAsync(subject.Id);

            if (existingSubject == null)
                throw new KeyNotFoundException("Yenilənəcək dərs tapılmadı.");

            
            if (!string.Equals(
                    existingSubject.SubjectCode,
                    subject.SubjectCode,
                    StringComparison.OrdinalIgnoreCase))
            {
                var subjectWithSameCode =
                    await _subjectRepository.GetByCodeAsync(subject.SubjectCode);

                if (subjectWithSameCode != null)
                    throw new InvalidOperationException(
                        "Bu dərs kodu artıq başqa bir dərsə məxsusdur.");
            }

            await _subjectRepository.UpdateAsync(subject);
        }

       
        public async Task DeleteAsync(int id)
        {
            var subject = await _subjectRepository.GetByIdAsync(id);

            if (subject == null)
                throw new KeyNotFoundException("Silinəcək dərs tapılmadı.");
            if (await _examRepository.HasExamsAsync(id))
                throw new InvalidOperationException(
                    "Bu fənn üzrə imtahanlar mövcuddur. Silmək olmaz.");
            await _subjectRepository.DeleteAsync(subject);
        }
    }
}
