/*
 * ============================================================
 *  Student Management System - C Backend
 *  File   : student_db.c
 *  Compile: gcc student_db.c -lsqlite3 -o student_db
 * ============================================================
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sqlite3.h>

#define DB_FILE "students.db"

/* ── Open / create database ── */
sqlite3 *openDatabase(void)
{
    sqlite3 *db = NULL;
    if (sqlite3_open(DB_FILE, &db) != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Cannot open DB: %s\n", sqlite3_errmsg(db));
        sqlite3_close(db);
        return NULL;
    }
    printf("[INFO] Database opened: %s\n", DB_FILE);
    return db;
}

/* ── Create table ── */
int createTable(sqlite3 *db)
{
    const char *sql =
        "CREATE TABLE IF NOT EXISTS students ("
        "  id    INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  name  TEXT    NOT NULL,"
        "  age   INTEGER NOT NULL,"
        "  grade TEXT    NOT NULL,"
        "  email TEXT    UNIQUE NOT NULL"
        ");";
    char *err = NULL;
    if (sqlite3_exec(db, sql, NULL, NULL, &err) != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Create table: %s\n", err);
        sqlite3_free(err);
        return 0;
    }
    printf("[INFO] Table 'students' ready.\n");
    return 1;
}

/* ── addStudent – INSERT a new row ── */
int addStudent(sqlite3 *db, const char *name, int age,
               const char *grade, const char *email)
{
    const char *sql =
        "INSERT INTO students (name,age,grade,email) VALUES (?,?,?,?);";
    sqlite3_stmt *stmt = NULL;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Prepare addStudent: %s\n", sqlite3_errmsg(db));
        return 0;
    }
    sqlite3_bind_text(stmt, 1, name, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 2, age);
    sqlite3_bind_text(stmt, 3, grade, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 4, email, -1, SQLITE_STATIC);
    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE)
    {
        fprintf(stderr, "[ERROR] Insert: %s\n", sqlite3_errmsg(db));
        return 0;
    }
    printf("[OK] Student '%s' added. ID=%lld\n",
           name, (long long)sqlite3_last_insert_rowid(db));
    return 1;
}

/* ── displayStudents – SELECT all and print ── */
void displayStudents(sqlite3 *db)
{
    const char *sql =
        "SELECT id,name,age,grade,email FROM students ORDER BY id;";
    sqlite3_stmt *stmt = NULL;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Prepare displayStudents: %s\n", sqlite3_errmsg(db));
        return;
    }
    printf("\n%-6s %-20s %-5s %-8s %-28s\n",
           "ID", "Name", "Age", "Grade", "Email");
    for (int i = 0; i < 70; i++)
        putchar('-');
    putchar('\n');
    int count = 0;
    while (sqlite3_step(stmt) == SQLITE_ROW)
    {
        printf("%-6d %-20s %-5d %-8s %-28s\n",
               sqlite3_column_int(stmt, 0),
               sqlite3_column_text(stmt, 1),
               sqlite3_column_int(stmt, 2),
               sqlite3_column_text(stmt, 3),
               sqlite3_column_text(stmt, 4));
        count++;
    }
    sqlite3_finalize(stmt);
    printf("\nTotal: %d record(s)\n\n", count);
}

/* ── deleteStudent – DELETE by id ── */
int deleteStudent(sqlite3 *db, int id)
{
    const char *sql = "DELETE FROM students WHERE id=?;";
    sqlite3_stmt *stmt = NULL;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Prepare deleteStudent: %s\n", sqlite3_errmsg(db));
        return 0;
    }
    sqlite3_bind_int(stmt, 1, id);
    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE)
    {
        fprintf(stderr, "[ERROR] Delete: %s\n", sqlite3_errmsg(db));
        return 0;
    }
    if (sqlite3_changes(db) == 0)
    {
        printf("[WARN] No student with ID %d.\n", id);
        return 0;
    }
    printf("[OK] Student ID %d deleted.\n", id);
    return 1;
}

/* ── modifyStudent – UPDATE by id (pass NULL/-1 to skip a field) ── */
int modifyStudent(sqlite3 *db, int id,
                  const char *name, int age,
                  const char *grade, const char *email)
{
    char sql[512] = "UPDATE students SET ";
    char clause[256] = "";
    int comma = 0;
    if (name)
    {
        strcat(clause, comma ? ",name=?" : "name=?");
        comma = 1;
    }
    if (age >= 0)
    {
        strcat(clause, comma ? ",age=?" : "age=?");
        comma = 1;
    }
    if (grade)
    {
        strcat(clause, comma ? ",grade=?" : "grade=?");
        comma = 1;
    }
    if (email)
    {
        strcat(clause, comma ? ",email=?" : "email=?");
        comma = 1;
    }
    if (!comma)
    {
        printf("[WARN] Nothing to update.\n");
        return 0;
    }
    strcat(sql, clause);
    strcat(sql, " WHERE id=?;");

    sqlite3_stmt *stmt = NULL;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Prepare modifyStudent: %s\n", sqlite3_errmsg(db));
        return 0;
    }
    int idx = 1;
    if (name)
        sqlite3_bind_text(stmt, idx++, name, -1, SQLITE_STATIC);
    if (age >= 0)
        sqlite3_bind_int(stmt, idx++, age);
    if (grade)
        sqlite3_bind_text(stmt, idx++, grade, -1, SQLITE_STATIC);
    if (email)
        sqlite3_bind_text(stmt, idx++, email, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, idx, id);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE)
    {
        fprintf(stderr, "[ERROR] Update: %s\n", sqlite3_errmsg(db));
        return 0;
    }
    if (sqlite3_changes(db) == 0)
    {
        printf("[WARN] No student with ID %d.\n", id);
        return 0;
    }
    printf("[OK] Student ID %d updated.\n", id);
    return 1;
}

/* ── Interactive menu ── */
static void printMenu(void)
{
    printf("╔══════════════════════════════════╗\n");
    printf("║   Student Management System      ║\n");
    printf("╠══════════════════════════════════╣\n");
    printf("║  1. Add Student                  ║\n");
    printf("║  2. Display All Students         ║\n");
    printf("║  3. Delete Student               ║\n");
    printf("║  4. Modify Student               ║\n");
    printf("║  5. Exit                         ║\n");
    printf("╚══════════════════════════════════╝\n");
    printf("Choice: ");
}

int main(void)
{
    sqlite3 *db = openDatabase();
    if (!db)
        return EXIT_FAILURE;
    if (!createTable(db))
    {
        sqlite3_close(db);
        return EXIT_FAILURE;
    }

    int choice;
    char name[100], grade[20], email[100];
    int age, id;

    while (1)
    {
        printMenu();
        if (scanf("%d", &choice) != 1)
        {
            while (getchar() != '\n')
                ;
            continue;
        }
        while (getchar() != '\n')
            ;

        switch (choice)
        {
        case 1:
            printf("Name  : ");
            fgets(name, sizeof(name), stdin);
            name[strcspn(name, "\n")] = '\0';
            printf("Age   : ");
            scanf("%d", &age);
            while (getchar() != '\n')
                ;
            printf("Grade : ");
            fgets(grade, sizeof(grade), stdin);
            grade[strcspn(grade, "\n")] = '\0';
            printf("Email : ");
            fgets(email, sizeof(email), stdin);
            email[strcspn(email, "\n")] = '\0';
            addStudent(db, name, age, grade, email);
            break;
        case 2:
            displayStudents(db);
            break;
        case 3:
            printf("Student ID to delete: ");
            scanf("%d", &id);
            while (getchar() != '\n')
                ;
            deleteStudent(db, id);
            break;
        case 4:
            printf("Student ID to modify: ");
            scanf("%d", &id);
            while (getchar() != '\n')
                ;
            printf("New name  (Enter to skip): ");
            fgets(name, sizeof(name), stdin);
            name[strcspn(name, "\n")] = '\0';
            printf("New age   (-1 to skip)  : ");
            scanf("%d", &age);
            while (getchar() != '\n')
                ;
            printf("New grade (Enter to skip): ");
            fgets(grade, sizeof(grade), stdin);
            grade[strcspn(grade, "\n")] = '\0';
            printf("New email (Enter to skip): ");
            fgets(email, sizeof(email), stdin);
            email[strcspn(email, "\n")] = '\0';
            modifyStudent(db, id,
                          name[0] ? name : NULL, age,
                          grade[0] ? grade : NULL,
                          email[0] ? email : NULL);
            break;
        case 5:
            printf("Goodbye!\n");
            sqlite3_close(db);
            return EXIT_SUCCESS;
        default:
            printf("[WARN] Invalid choice.\n");
        }
    }
}