/*
 * ============================================================
 *  Student Management System - C Backend
 *  File   : student_db.c
 *  Author : First-Year Student Project
 *  Lib    : SQLite3  (compile: gcc student_db.c -lsqlite3 -o student_db)
 * ============================================================
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sqlite3.h>

/* ── Database file name ── */
#define DB_FILE "students.db"

/* ── Column widths for pretty-printing ── */
#define COL_ID 6
#define COL_NAME 20
#define COL_AGE 5
#define COL_GRD 8
#define COL_EML 28

/* ══════════════════════════════════════════════════════════════
 *  openDatabase
 *  Opens (or creates) the SQLite database and returns a handle.
 *  Returns NULL on failure.
 * ══════════════════════════════════════════════════════════════ */
sqlite3 *openDatabase(void)
{
    sqlite3 *db = NULL;
    int rc = sqlite3_open(DB_FILE, &db);

    if (rc != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Cannot open database: %s\n",
                sqlite3_errmsg(db));
        sqlite3_close(db);
        return NULL;
    }
    printf("[INFO] Database opened successfully: %s\n", DB_FILE);
    return db;
}

/* ══════════════════════════════════════════════════════════════
 *  createTable
 *  Creates the 'students' table if it does not already exist.
 * ══════════════════════════════════════════════════════════════ */
int createTable(sqlite3 *db)
{
    const char *sql =
        "CREATE TABLE IF NOT EXISTS students ("
        "  id      INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  name    TEXT    NOT NULL,"
        "  age     INTEGER NOT NULL,"
        "  grade   TEXT    NOT NULL,"
        "  email   TEXT    UNIQUE NOT NULL"
        ");";

    char *errMsg = NULL;
    int rc = sqlite3_exec(db, sql, NULL, NULL, &errMsg);

    if (rc != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Create table failed: %s\n", errMsg);
        sqlite3_free(errMsg);
        return 0; /* failure */
    }
    printf("[INFO] Table 'students' ready.\n");
    return 1; /* success */
}

/* ══════════════════════════════════════════════════════════════
 *  addStudent
 *  Inserts a new student row into the database.
 *
 *  Parameters:
 *    db    – open database handle
 *    name  – student full name
 *    age   – student age (integer)
 *    grade – grade / class string  e.g. "A", "B+", "Year 2"
 *    email – unique student e-mail
 *
 *  Returns 1 on success, 0 on failure.
 * ══════════════════════════════════════════════════════════════ */
int addStudent(sqlite3 *db,
               const char *name,
               int age,
               const char *grade,
               const char *email)
{
    /* Use a prepared statement to avoid SQL-injection risks */
    const char *sql =
        "INSERT INTO students (name, age, grade, email) "
        "VALUES (?, ?, ?, ?);";

    sqlite3_stmt *stmt = NULL;
    int rc = sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);

    if (rc != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Prepare failed (addStudent): %s\n",
                sqlite3_errmsg(db));
        return 0;
    }

    /* Bind parameters  (index starts at 1 in SQLite) */
    sqlite3_bind_text(stmt, 1, name, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 2, age);
    sqlite3_bind_text(stmt, 3, grade, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 4, email, -1, SQLITE_STATIC);

    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);

    if (rc != SQLITE_DONE)
    {
        fprintf(stderr, "[ERROR] Insert failed: %s\n",
                sqlite3_errmsg(db));
        return 0;
    }

    printf("[OK] Student '%s' added with ID %lld.\n",
           name, (long long)sqlite3_last_insert_rowid(db));
    return 1;
}

/* ══════════════════════════════════════════════════════════════
 *  displayStudents
 *  Fetches and prints all students in a formatted table.
 * ══════════════════════════════════════════════════════════════ */
void displayStudents(sqlite3 *db)
{
    const char *sql =
        "SELECT id, name, age, grade, email FROM students ORDER BY id;";

    sqlite3_stmt *stmt = NULL;
    int rc = sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);

    if (rc != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Prepare failed (displayStudents): %s\n",
                sqlite3_errmsg(db));
        return;
    }

    /* ── Header ── */
    printf("\n%-*s %-*s %-*s %-*s %-*s\n",
           COL_ID, "ID",
           COL_NAME, "Name",
           COL_AGE, "Age",
           COL_GRD, "Grade",
           COL_EML, "Email");

    /* Separator line */
    for (int i = 0; i < COL_ID + COL_NAME + COL_AGE + COL_GRD + COL_EML + 4; i++)
        putchar('-');
    putchar('\n');

    /* ── Rows ── */
    int count = 0;
    while (sqlite3_step(stmt) == SQLITE_ROW)
    {
        int id = sqlite3_column_int(stmt, 0);
        const char *name = (const char *)sqlite3_column_text(stmt, 1);
        int age = sqlite3_column_int(stmt, 2);
        const char *grade = (const char *)sqlite3_column_text(stmt, 3);
        const char *email = (const char *)sqlite3_column_text(stmt, 4);

        printf("%-*d %-*s %-*d %-*s %-*s\n",
               COL_ID, id,
               COL_NAME, name,
               COL_AGE, age,
               COL_GRD, grade,
               COL_EML, email);
        count++;
    }

    sqlite3_finalize(stmt);

    if (count == 0)
        printf("(No students found)\n");

    printf("\nTotal records: %d\n\n", count);
}

/* ══════════════════════════════════════════════════════════════
 *  deleteStudent
 *  Removes a student row identified by their integer ID.
 *  Returns 1 if a row was deleted, 0 otherwise.
 * ══════════════════════════════════════════════════════════════ */
int deleteStudent(sqlite3 *db, int studentId)
{
    const char *sql = "DELETE FROM students WHERE id = ?;";

    sqlite3_stmt *stmt = NULL;
    int rc = sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);

    if (rc != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Prepare failed (deleteStudent): %s\n",
                sqlite3_errmsg(db));
        return 0;
    }

    sqlite3_bind_int(stmt, 1, studentId);
    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);

    if (rc != SQLITE_DONE)
    {
        fprintf(stderr, "[ERROR] Delete failed: %s\n",
                sqlite3_errmsg(db));
        return 0;
    }

    /* sqlite3_changes() tells us how many rows were affected */
    int changed = sqlite3_changes(db);
    if (changed == 0)
    {
        printf("[WARN] No student found with ID %d.\n", studentId);
        return 0;
    }

    printf("[OK] Student with ID %d deleted.\n", studentId);
    return 1;
}

/* ══════════════════════════════════════════════════════════════
 *  modifyStudent
 *  Updates one or more fields of an existing student.
 *  Pass NULL (for strings) or -1 (for age) to leave a field
 *  unchanged.
 *
 *  Returns 1 on success, 0 on failure.
 * ══════════════════════════════════════════════════════════════ */
int modifyStudent(sqlite3 *db,
                  int studentId,
                  const char *newName,
                  int newAge,
                  const char *newGrade,
                  const char *newEmail)
{
    /*
     * Build the UPDATE statement dynamically so we only change
     * the fields the caller actually provides.
     */
    char sql[512] = "UPDATE students SET ";
    char clause[256] = "";
    int needComma = 0;

    if (newName)
    {
        strcat(clause, needComma ? ", name=?" : "name=?");
        needComma = 1;
    }
    if (newAge >= 0)
    {
        strcat(clause, needComma ? ", age=?" : "age=?");
        needComma = 1;
    }
    if (newGrade)
    {
        strcat(clause, needComma ? ", grade=?" : "grade=?");
        needComma = 1;
    }
    if (newEmail)
    {
        strcat(clause, needComma ? ", email=?" : "email=?");
        needComma = 1;
    }

    if (!needComma)
    {
        printf("[WARN] modifyStudent: nothing to update.\n");
        return 0;
    }

    strcat(sql, clause);
    strcat(sql, " WHERE id=?;");

    sqlite3_stmt *stmt = NULL;
    int rc = sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);

    if (rc != SQLITE_OK)
    {
        fprintf(stderr, "[ERROR] Prepare failed (modifyStudent): %s\n",
                sqlite3_errmsg(db));
        return 0;
    }

    /* Bind values in the same order we built the SET clause */
    int idx = 1;
    if (newName)
        sqlite3_bind_text(stmt, idx++, newName, -1, SQLITE_STATIC);
    if (newAge >= 0)
        sqlite3_bind_int(stmt, idx++, newAge);
    if (newGrade)
        sqlite3_bind_text(stmt, idx++, newGrade, -1, SQLITE_STATIC);
    if (newEmail)
        sqlite3_bind_text(stmt, idx++, newEmail, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, idx, studentId); /* WHERE id=? */

    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);

    if (rc != SQLITE_DONE)
    {
        fprintf(stderr, "[ERROR] Update failed: %s\n",
                sqlite3_errmsg(db));
        return 0;
    }

    if (sqlite3_changes(db) == 0)
    {
        printf("[WARN] No student found with ID %d.\n", studentId);
        return 0;
    }

    printf("[OK] Student ID %d updated.\n", studentId);
    return 1;
}

/* ══════════════════════════════════════════════════════════════
 *  printMenu  –  helper to display the console menu
 * ══════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════
 *  main  –  interactive console loop
 * ══════════════════════════════════════════════════════════════ */
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

    int choice = 0;

    while (1)
    {
        printMenu();
        if (scanf("%d", &choice) != 1)
        {
            /* Clear bad input */
            while (getchar() != '\n')
                ;
            continue;
        }
        /* Consume trailing newline */
        while (getchar() != '\n')
            ;

        /* ── Buffers for user input ── */
        char name[100], grade[20], email[100];
        int age, id;

        switch (choice)
        {

        /* ---- 1. Add ---- */
        case 1:
            printf("Name  : ");
            fgets(name, sizeof(name), stdin);
            name[strcspn(name, "\n")] = '\0'; /* strip newline */

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

        /* ---- 2. Display ---- */
        case 2:
            displayStudents(db);
            break;

        /* ---- 3. Delete ---- */
        case 3:
            printf("Enter student ID to delete: ");
            scanf("%d", &id);
            while (getchar() != '\n')
                ;
            deleteStudent(db, id);
            break;

        /* ---- 4. Modify ---- */
        case 4:
            printf("Enter student ID to modify: ");
            scanf("%d", &id);
            while (getchar() != '\n')
                ;

            printf("New name  (press Enter to skip): ");
            fgets(name, sizeof(name), stdin);
            name[strcspn(name, "\n")] = '\0';

            printf("New age   (-1 to skip)         : ");
            scanf("%d", &age);
            while (getchar() != '\n')
                ;

            printf("New grade (press Enter to skip): ");
            fgets(grade, sizeof(grade), stdin);
            grade[strcspn(grade, "\n")] = '\0';

            printf("New email (press Enter to skip): ");
            fgets(email, sizeof(email), stdin);
            email[strcspn(email, "\n")] = '\0';

            modifyStudent(db,
                          id,
                          name[0] ? name : NULL,
                          age,
                          grade[0] ? grade : NULL,
                          email[0] ? email : NULL);
            break;

        /* ---- 5. Exit ---- */
        case 5:
            printf("Goodbye!\n");
            sqlite3_close(db);
            return EXIT_SUCCESS;

        default:
            printf("[WARN] Invalid choice. Please try again.\n");
        }
    }
}