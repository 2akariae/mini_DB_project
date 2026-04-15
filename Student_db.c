#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sqlite3.h>

// Global database connection
sqlite3 *db;

// Open database and create table if it does not exist
void init_db()
{
    int rc = sqlite3_open("students.db", &db);
    if (rc != SQLITE_OK)
    {
        printf("Error opening database: %s\n", sqlite3_errmsg(db));
        exit(1);
    }

    char *sql = "CREATE TABLE IF NOT EXISTS students ("
                "id    INTEGER PRIMARY KEY AUTOINCREMENT,"
                "name  TEXT    NOT NULL,"
                "age   INTEGER NOT NULL,"
                "grade REAL    NOT NULL);";

    char *err = NULL;
    rc = sqlite3_exec(db, sql, NULL, NULL, &err);
    if (rc != SQLITE_OK)
    {
        printf("Error creating table: %s\n", err);
        sqlite3_free(err);
    }
}

// Add a new student
void add_student()
{
    char name[50];
    int age;
    float grade;

    printf("Name: ");
    fgets(name, 50, stdin);
    name[strcspn(name, "\n")] = '\0';

    printf("Age: ");
    scanf("%d", &age);

    printf("Grade (out of 20): ");
    scanf("%f", &grade);
    getchar();

    sqlite3_stmt *stmt;
    char *sql = "INSERT INTO students (name, age, grade) VALUES (?, ?, ?);";

    sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);
    sqlite3_bind_text(stmt, 1, name, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 2, age);
    sqlite3_bind_double(stmt, 3, grade);

    int rc = sqlite3_step(stmt);
    if (rc == SQLITE_DONE)
        printf("Student added! ID = %lld\n", sqlite3_last_insert_rowid(db));
    else
        printf("Error: %s\n", sqlite3_errmsg(db));

    sqlite3_finalize(stmt);
}

// Show all students
void view_students()
{
    char *sql = "SELECT * FROM students;";
    sqlite3_stmt *stmt;

    sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);

    int count = 0;
    printf("\n%-5s %-25s %-5s %-8s\n", "ID", "Name", "Age", "Grade");
    printf("--------------------------------------------------\n");

    while (sqlite3_step(stmt) == SQLITE_ROW)
    {
        int id = sqlite3_column_int(stmt, 0);
        const unsigned char *name = sqlite3_column_text(stmt, 1);
        int age = sqlite3_column_int(stmt, 2);
        double grade = sqlite3_column_double(stmt, 3);
        printf("%-5d %-25s %-5d %.2f\n", id, name, age, grade);
        count++;
    }

    printf("--------------------------------------------------\n");
    printf("Total: %d student(s)\n", count);
    sqlite3_finalize(stmt);
}

// Search a student by ID
void search_student()
{
    int sid;
    printf("Enter student ID: ");
    scanf("%d", &sid);
    getchar();

    sqlite3_stmt *stmt;
    char *sql = "SELECT * FROM students WHERE id = ?;";

    sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);
    sqlite3_bind_int(stmt, 1, sid);

    if (sqlite3_step(stmt) == SQLITE_ROW)
    {
        int id = sqlite3_column_int(stmt, 0);
        const unsigned char *name = sqlite3_column_text(stmt, 1);
        int age = sqlite3_column_int(stmt, 2);
        double grade = sqlite3_column_double(stmt, 3);
        printf("\nID: %d | Name: %s | Age: %d | Grade: %.2f\n", id, name, age, grade);
    }
    else
    {
        printf("Student with ID %d not found.\n", sid);
    }
    sqlite3_finalize(stmt);
}

// Modify an existing student (UPDATE query)
void modify_student()
{
    int sid;
    printf("Enter student ID to modify: ");
    scanf("%d", &sid);
    getchar();

    // First check if the student exists
    sqlite3_stmt *check;
    sqlite3_prepare_v2(db, "SELECT id FROM students WHERE id = ?;", -1, &check, NULL);
    sqlite3_bind_int(check, 1, sid);

    if (sqlite3_step(check) != SQLITE_ROW)
    {
        printf("Student with ID %d not found.\n", sid);
        sqlite3_finalize(check);
        return;
    }
    sqlite3_finalize(check);

    // Read new values
    char name[50];
    int age;
    float grade;

    printf("New name: ");
    fgets(name, 50, stdin);
    name[strcspn(name, "\n")] = '\0';

    printf("New age: ");
    scanf("%d", &age);

    printf("New grade: ");
    scanf("%f", &grade);
    getchar();

    // Run the UPDATE query
    sqlite3_stmt *stmt;
    char *sql = "UPDATE students SET name = ?, age = ?, grade = ? WHERE id = ?;";

    sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);
    sqlite3_bind_text(stmt, 1, name, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 2, age);
    sqlite3_bind_double(stmt, 3, grade);
    sqlite3_bind_int(stmt, 4, sid);

    int rc = sqlite3_step(stmt);
    if (rc == SQLITE_DONE)
        printf("Student %d updated successfully.\n", sid);
    else
        printf("Error: %s\n", sqlite3_errmsg(db));

    sqlite3_finalize(stmt);
}

// Delete a student by ID
void delete_student()
{
    int sid;
    printf("Enter student ID to delete: ");
    scanf("%d", &sid);
    getchar();

    sqlite3_stmt *stmt;
    char *sql = "DELETE FROM students WHERE id = ?;";

    sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);
    sqlite3_bind_int(stmt, 1, sid);

    int rc = sqlite3_step(stmt);
    if (rc == SQLITE_DONE)
    {
        if (sqlite3_changes(db) > 0)
            printf("Student %d deleted.\n", sid);
        else
            printf("Student with ID %d not found.\n", sid);
    }
    else
    {
        printf("Error: %s\n", sqlite3_errmsg(db));
    }
    sqlite3_finalize(stmt);
}

// Main menu
int main()
{
    init_db();

    int choice;
    printf("=== Student Database (SQLite) ===\n");

    do
    {
        printf("\n1. Add student\n");
        printf("2. View all\n");
        printf("3. Search by ID\n");
        printf("4. Modify student\n");
        printf("5. Delete student\n");
        printf("6. Exit\n");
        printf("Choice: ");
        scanf("%d", &choice);
        getchar();

        if (choice == 1)
            add_student();
        else if (choice == 2)
            view_students();
        else if (choice == 3)
            search_student();
        else if (choice == 4)
            modify_student();
        else if (choice == 5)
            delete_student();
        else if (choice == 6)
            printf("Goodbye!\n");
        else
            printf("Invalid choice.\n");

    } while (choice != 6);

    sqlite3_close(db);
    return 0;
}