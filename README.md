ExamSystem – İmtahan İdarəetmə Sistemi

Bu layihə ASP.NET Core MVC üzərində qurulmuş, məktəb tipli təhsil müəssisələri üçün nəzərdə tutulmuş imtahan idarəetmə sistemidir. Layihənin əsas məqsədi sadə CRUD əməliyyatlarından kənara çıxaraq real biznes qaydaları ilə işləyən, təmiz arxitekturalı və genişlənə bilən bir sistem qurmaqdır.

Layihə hazırlanarkən real sistemlərdə qarşılaşılan problemlər və qaydalar nəzərə alınmışdır. Burada yalnız məlumat əlavə etmək deyil, həmin məlumatların düzgünlüyü, təkrarlanmasının qarşısının alınması, istifadəçi üçün aydın göstərilməsi və sistemin stabil davranışı əsas götürülmüşdür.

İstifadə olunan texnologiyalar:
ASP.NET Core MVC framework
Entity Framework Core
SQL Server
Clean Architecture prinsipləri
Repository və Service Pattern
Razor Views
Bootstrap 5
Enum-based validation
Global Exception Handling

Layihə arxitekturası Clean Architecture yanaşmasına əsaslanır. Sistem dörd əsas qatdan ibarətdir: Domain, Application, Infrastructure və Web. Domain qatında əsas entity-lər və enum-lar saxlanılır. Application qatında repository və service interfeysləri, həmçinin biznes məntiqi yerləşir. Infrastructure qatında DbContext və repository implementasiyaları mövcuddur. Web qatında isə controller-lər, view model-lər və Razor UI yerləşir. Bu bölgü kodun oxunaqlılığını, test edilə bilməsini və gələcəkdə genişləndirilməsini asanlaşdırır.

Student (Şagird) modulu şagirdlərin idarə olunması üçün nəzərdə tutulmuşdur. Şagird əlavə edilərkən StudentNumber avtomatik olaraq sistem tərəfindən yaradılır. Bu dəyər database-də int tipində saxlanılır, lakin istifadəçiyə UI-də STD-0001 formatında göstərilir. Bu yanaşma database performansını qoruyur və eyni zamanda istifadəçi üçün daha anlaşılan görüntü yaradır. Bu formatlama ViewModel səviyyəsində edilir ki, UI-də əlavə məntiq yazmağa ehtiyac qalmasın.

Şagirdin sinfi Grade enum-u vasitəsilə idarə olunur. Grade yalnız 1-dən 11-ə qədər dəyərləri qəbul edir. Bu enum həm UI səviyyəsində select box ilə, həm də service qatında yoxlanılır. Nəticədə yanlış sinif dəyərinin daxil edilməsi mümkün olmur.

Subject (Fənn) modulunda real biznes qaydaları tətbiq olunmuşdur. Eyni sinif üçün eyni adda fənnin əlavə edilməsinə icazə verilmir. Bu qayda service qatında yoxlanılır. Eyni fənn fərqli siniflər üçün mövcud ola bilər, lakin eyni sinifdə təkrar ola bilməz. Bu yanaşma real məktəb sistemlərinə uyğundur.

SubjectCode avtomatik yaradılır və fənnin adından qısa kod kimi formalaşdırılır (məsələn, Fizika → FIZ). SubjectCode sinifdən asılı olaraq dəyişmir və əlavə sufixlər (1, 2, -10 və s.) istifadə edilmir. Bunun səbəbi SubjectCode-un fənni təmsil etməsidir, sinfi yox. Sinif məlumatı ayrıca Grade sahəsində saxlanılır.

Exam (İmtahan) modulu şagirdlər və fənlər arasında əlaqəni idarə edir. İmtahan yalnız mövcud şagird və mövcud fənn üçün əlavə edilə bilər. ExamDate və Score kimi məlumatlar saxlanılır. İmtahanlar mərkəzi Exam modulundan idarə olunur.

Student Details səhifəsində şagirdin imtahanları yalnız oxuma (read-only) rejimində göstərilir. Bu səhifədə “İmtahan əlavə et” düyməsi qəsdən çıxarılmışdır. Bunun səbəbi Single Responsibility prinsipidir. Details səhifəsi yalnız məlumat göstərmək üçündür, data yaratmaq üçün yox. İmtahan əlavə etmək yalnız Exam modulunda mümkündür. Bu yanaşma həm UX, həm də memarlıq baxımından daha doğrudur.

Layihədə controller-lərdə try-catch istifadə olunmur. Bütün xətalar GlobalExceptionFilter vasitəsilə mərkəzləşdirilmiş şəkildə idarə olunur. InvalidOperationException və KeyNotFoundException kimi xətalar tutulur və istifadəçiyə UI-də yuxarı hissədə Bootstrap alert şəklində göstərilir. Bu zaman yeni səhifə açılmır və istifadəçi kontekstdən çıxmır. Bu davranış real sistemlərdə istifadə olunan standart yanaşmadır.

Database səviyyəsində Foreign Key qaydaları qorunur. Məsələn, əgər hər hansı bir fənn üzrə imtahanlar mövcuddursa, həmin fənnin silinməsinə icazə verilmir. Bu qayda həm database constraint-ləri, həm də service qatında yoxlamalar vasitəsilə təmin olunur.

UI tərəfində Razor Views sadə saxlanılmışdır. Bütün display məntiqi ViewModel-lərdə həll edilmişdir. Details səhifələri yalnız oxuma məqsədlidir. Create və Edit əməliyyatları ayrı səhifələrdə həyata keçirilir. Bootstrap istifadə edilərək sadə, anlaşılan və professional admin panel görünüşü əldə edilmişdir.
