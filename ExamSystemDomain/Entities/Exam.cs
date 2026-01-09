using ExamSystemDomain.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemDomain.Entities
{
    // Şagirdin müəyyən bir dərsdən verdiyi imtahanı təmsil edir
    public class Exam : BaseEntity
    {
        // Şagirdin texniki ID-si (foreign key)
        public int StudentId { get; set; }

        // Dərsin texniki ID-si (foreign key)
        public int SubjectId { get; set; }

        // İmtahanın keçirildiyi tarix
        public DateTime ExamDate { get; set; }

        // İmtahan qiyməti (1–9 arası)
        public int Score { get; set; }

        // Şagird entity-si ilə əlaqə
        // Əlaqə: çox imtahan -> 1 şagird
        public Student Student { get; set; } = null!;

        // Dərs entity-si ilə əlaqə
        // Əlaqə: çox imtahan -> 1 dərs
        public Subject Subject { get; set; } = null!;
    }
}
