using ExamSystemDomain.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemDomain.Entities
{
   
    public class Exam : BaseEntity
    {
       
        public int StudentId { get; set; }

     
        public int SubjectId { get; set; }

      
        public DateTime ExamDate { get; set; }

        
        public int Score { get; set; }

      
        public Student Student { get; set; } = null!;

      
        public Subject Subject { get; set; } = null!;
    }
}
