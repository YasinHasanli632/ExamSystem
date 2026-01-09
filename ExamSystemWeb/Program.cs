using ExamSystemApplication.Interfaces.Repositories;
using ExamSystemApplication.Interfaces.Services;
using ExamSystemApplication.Services;
using ExamSystemApplication.Services.ExamSystemApplication.Services;
using ExamSystemInfrastructure.Data;
using ExamSystemInfrastructure.Data.ExamSystemInfrastructure.Data;
using ExamSystemInfrastructure.Repositories;
using ExamSystemWeb.Filters;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// =========================
// Add services to container
// =========================

// MVC
builder.Services.AddControllersWithViews();
builder.Services.AddControllersWithViews(options =>
{
    options.Filters.Add<GlobalExceptionFilter>();
});

// DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

// =========================
// Repositories (Infrastructure)
// =========================
builder.Services.AddScoped<IStudentRepository, StudentRepository>();
builder.Services.AddScoped<ISubjectRepository, SubjectRepository>();
builder.Services.AddScoped<IExamRepository, ExamRepository>();

// =========================
// Services (Application)
// =========================
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<IExamService, ExamService>();

var app = builder.Build();

// =========================
// HTTP request pipeline
// =========================
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

// =========================
// Routing
// =========================
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
