Exam System 

Layihə Haqqında Ümumi Məlumat

Bu layihə ASP.NET Core MVC texnologiyası üzərində qurulmuş məktəb tipli imtahan idarəetmə sistemidir. Layihə Clean Architecture prinsiplərinə əsaslanır və qatlar arasında məsuliyyət bölgüsü aydın şəkildə qorunur. İmtahan modulu real məktəb mühitində tətbiq olunan qaydalar nəzərə alınaraq dizayn edilmişdir. Modulun əsas məqsədi imtahanların düzgün biznes qaydalarına uyğun şəkildə yaradılmasını və redaktə edilməsini təmin etməkdir.

Sistem real məktəb strukturunu modelləşdirir. Hər bir şagird müəyyən bir sinfə aiddir. Hər bir fənn yalnız müəyyən bir sinif üçün təyin olunur. İmtahan isə yalnız şagirdin aid olduğu sinfə uyğun fənn üzrə yaradıla və redaktə edilə bilər. Bu qayda həm Create, həm də Edit əməliyyatlarında eyni şəkildə qorunur.

İstifadə Olunan Texnologiyalar

ASP.NET Core MVC
Razor Views
Bootstrap 5
Entity Framework Core
SQL Server
Clean Architecture
Repository Pattern
Service Layer
AJAX (Dependent Dropdown üçün)
Global Exception Handling (GlobalExceptionFilter)

Arxitektura Quruluşu

Layihə Clean Architecture yanaşması əsasında hazırlanmışdır və aşağıdakı qatlara bölünür.

Domain qatı
Bu qatda əsas biznes obyektləri yerləşir. Student, Subject və Exam entity-ləri, eləcə də Grade enum-u bu qatda saxlanılır. Domain qatı heç bir UI və ya database asılılığı daşımır və yalnız biznes məntiqini əks etdirir.

Application qatı
Bu qatda servis interfeysləri yerləşir. IStudentService, ISubjectService və IExamService kimi interfeyslər vasitəsilə controller-lər biznes qaydalarına uyğun şəkildə işləyir. Controller-lər repository qatına birbaşa müraciət etmir, bütün əməliyyatlar servislər üzərindən icra olunur.

Infrastructure qatı
Bu qat database əməliyyatlarını icra edir. Entity Framework Core istifadə edilərək AppDbContext və repository-lər implementasiya olunmuşdur. Məlumatın əlavə edilməsi, yenilənməsi, silinməsi və xüsusi sorğular (sinifə görə fənn, şagirdə görə imtahan və s.) bu qatda həyata keçirilir.

Bu layihədə SaveChangesAsync metodu repository səviyyəsində qəsdən istifadə olunmuşdur. Məqsəd hər bir CRUD əməliyyatının atomik və aydın şəkildə icra olunmasını təmin etməkdir. Hər repository metodu öz əməliyyatının məsuliyyətini daşıyır və dəyişikliklərin database-ə yazılması explicit şəkildə həyata keçirilir. Bu yanaşma kiçik və orta ölçülü layihələr üçün oxunaqlılığı artırır və əməliyyat axınını daha rahat izləməyə imkan verir.

Web qatı
Bu qat istifadəçi interfeysini və HTTP sorğularını idarə edir. Controller-lər, ViewModel-lər və Razor View-lər bu qatda yerləşir. UI yalnız təqdimat və istifadəçi qarşılıqlı əlaqəsi üçündür, biznes məntiqi saxlanılmır.

Qlobal Exception İdarəetməsi

Layihədə GlobalExceptionFilter istifadə olunur. Service və Repository qatında atılan exception-lar UI-də xam şəkildə göstərilmir. Xətalar mərkəzləşdirilmiş şəkildə idarə olunur və istifadəçiyə uyğun davranış təmin edilir.

Create və Edit Məntiqi

Create səhifəsi açıldıqda fənn siyahısı boş vəziyyətdə olur. İstifadəçi əvvəlcə şagirdi seçir. Şagird seçildikdən sonra sistem avtomatik olaraq həmin şagirdin sinfini müəyyən edir və yalnız həmin sinfə uyğun fənnlər istifadəçiyə təqdim olunur.

Edit səhifəsində isə mövcud imtahanın aid olduğu şagird avtomatik müəyyən edilir və fənn siyahısı dərhal həmin şagirdin sinfinə uyğun şəkildə doldurulur. Create və Edit səhifələri eyni biznes qaydasına əsaslanır və davranış baxımından tam uyğundur.

Dinamik UI Davranışı

Şagird və fənn sahələri arasında asılı dropdown mexanizmi qurulmuşdur. Şagird seçilməyənədək fənn sahəsi deaktiv vəziyyətdə qalır və istifadəçiyə əvvəlcə şagird seçilməsi barədə məlumat verilir.

Şagird seçildikdən sonra serverə AJAX sorğusu göndərilir. Server tərəfində şagirdin sinfi müəyyən edilir və yalnız uyğun fənnlər JSON formatında geri qaytarılır. Əgər seçilmiş şagird üçün heç bir fənn mövcud deyilsə, istifadəçiyə bu barədə açıq və anlaşılan mesaj göstərilir.

Validation və Davranış

ModelState doğrulaması uğursuz olduqda form yenidən göstərilərkən şagird və fənn seçimləri itmir. Dropdown-lar mövcud şagirdin sinfinə uyğun şəkildə yenidən doldurulur. Bu yanaşma istifadəçi təcrübəsinin qorunmasını və səhvlərin rahat şəkildə düzəldilməsini təmin edir.

Modullar və Metodlar

Students (Şagirdlər) modulu

IStudentService metodları
CreateAsync – yeni şagird yaradılması
GetByIdAsync – id-yə görə şagirdin gətirilməsi
GetByStudentNumberAsync – şagird nömrəsinə görə gətirilməsi
GetAllAsync – bütün şagirdlərin siyahısı
UpdateAsync – şagird məlumatlarının yenilənməsi
DeleteAsync – şagirdin silinməsi

IStudentRepository metodları
AddAsync – şagird əlavə edir və SaveChangesAsync icra edir
GetByIdAsync – id ilə şagirdi tapır
GetByStudentNumberAsync – student number ilə tapır
GetAllAsync – bütün şagirdlər
UpdateAsync – update və SaveChangesAsync
GetNextStudentSequenceAsync – növbəti şagird nömrəsi
DeleteAsync – delete və SaveChangesAsync

StudentsController metodları
Index, Details, Create (GET/POST), Edit (GET/POST), Delete

Subjects (Fənlər) modulu

ISubjectService metodları
CreateAsync, GetByIdAsync, GetByCodeAsync, GetAllAsync, GetByGradeAsync, UpdateAsync, DeleteAsync

ISubjectRepository metodları
AddAsync, GetByIdAsync, GetByCodeAsync, GetAllAsync, GetByGradeAsync, UpdateAsync, DeleteAsync

SubjectsController metodları
Index, Create (GET/POST), Edit (GET/POST), Delete

Exams (İmtahanlar) modulu

IExamService metodları
CreateAsync, GetByIdAsync, GetAllAsync, GetByStudentIdAsync, GetBySubjectIdAsync, UpdateAsync, DeleteAsync

IExamRepository metodları
AddAsync, GetByIdAsync, GetAllAsync, GetAllWithDetailsAsync, GetByStudentIdAsync, GetBySubjectIdAsync, HasExamsAsync, ExistsSameDayAsync, UpdateAsync, DeleteAsync

ExamsController metodları
Index, Create (GET/POST), Edit (GET/POST), Delete, GetSubjectsByStudent

Private helper metodlar
GetStudentsAsync – şagird dropdown-u üçün
GetSubjectsAsync – sinifə görə fənn dropdown-u üçün



Nəticə

Layihə strukturu və CRUD axınları qaydasındadır. Create və Edit əməliyyatlarında grade əsaslı subject filtrasiya düzgün işləyir. Global exception handling mövcuddur. Repository səviyyəsində SaveChangesAsync qəsdən və əsaslandırılmış şəkildə istifadə olunmuşdur. Ümumi olaraq sistem stabil, oxunaqlı, genişlənə bilən və texniki müsahibələrdə rahat izah edilə bilən peşəkar səviyyəli bir layihədir.


--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

Layihəni Lokalda İşə Salmaq Üçün

1. GitHub-dan layihəni klonlayın:
   git clone https://github.com/YasinHasanli632/ExamSystem.git

2. Layihəni Visual Studio-da açın:
   ExamSystem.sln faylını açmaq kifayətdir.

3. appsettings.json faylında connection string-i öz SQL Server mühitinizə uyğunlaşdırın.
   Məsələn:
   Server=.;Database=ExamSystemDb;Trusted_Connection=True;TrustServerCertificate=True;

4. NuGet paketlərini bərpa edin:
   Visual Studio-da:
   Tools → NuGet Package Manager → Restore NuGet Packages

5. Database migration-larını tətbiq edin:
   Tools → NuGet Package Manager → Package Manager Console açın
   Sonra aşağıdakı əmri icra edin:
   Update-Database

6. Tətbiqi işə salın:
   Visual Studio-da F5 və ya IIS Express düyməsi ilə layihəni run edin.

