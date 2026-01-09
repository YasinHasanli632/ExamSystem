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

        // =========================
        // Create
        // =========================
        public async Task<Subject> CreateAsync(Subject subject)
        {
            // 0️⃣ Grade enum yoxlaması
            if (!Enum.IsDefined(typeof(Grade), subject.Grade))
                throw new InvalidOperationException("Sinif 1 ilə 11 arasında olmalıdır.");

            // 🔒 EYNİ AD + EYNİ SİNİF QADAĞASI
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

            // 1️⃣ Fənn adından qısa kod (FIZ, RIY və s.)
            var words = subject.SubjectName
                .Trim()
                .ToUpper()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries);

            string shortName;

            if (words.Length == 1)
                shortName = words[0].Substring(0, Math.Min(3, words[0].Length));
            else
                shortName = string.Concat(words.Select(w => w[0]));

            // ✅ 2️⃣ SUBJECT CODE = SABİT (UNICALLAŞDIRMA YOX)
            subject.SubjectCode = shortName;

            // 3️⃣ Save
            await _subjectRepository.AddAsync(subject);

            return subject;
        }



        // =========================
        // Read
        // =========================
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

        // =========================
        // Update
        // =========================
        public async Task UpdateAsync(Subject subject)
        {

            if (!Enum.IsDefined(typeof(Grade), subject.Grade))
                throw new InvalidOperationException("Sinif 1 ilə 11 arasında olmalıdır.");
            var existingSubject =
                await _subjectRepository.GetByIdAsync(subject.Id);

            if (existingSubject == null)
                throw new KeyNotFoundException("Yenilənəcək dərs tapılmadı.");

            // Business rule: SubjectCode dəyişdirilirsə, unikal olmalıdır
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

        // =========================
        // Delete
        // =========================
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
