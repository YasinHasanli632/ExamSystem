using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemDomain.Common
{
    // Bütün entity-lər üçün əsas (base) sinif
    public abstract class BaseEntity
    {
        // Texniki primary key (ID)
        public int Id { get; set; }


    }
}
