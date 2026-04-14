#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sqlite3.h>

// Global database connection
sqlite3 *db;

// Open the database and create the table if it does not exist
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

    // Build the INSERT query using a prepared statement
    sqlite3_stmt *stmt;
    char *sql = "INSERT INTO students (name, age, grade) VALUES (?, ?, ?);";

    sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);
    sqlite3_bind_text(stmt, 1, name, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 2, age);
    sqlite3_bind_double(stmt, 3, grade);

    int rc = sqlite3_step(stmt);
    if (rc == SQLITE_DONE)
    {
        printf("Student added! ID = %lld\n", sqlite3_last_insert_rowid(db));
    }
    else
    {
        printf("Error adding student: %s\n", sqlite3_errmsg(db));
    }
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
        int rows = sqlite3_changes(db);
        if (rows > 0)
            printf("Student %d deleted.\n", sid);
        else
            printf("Student with ID %d not found.\n", sid);
    }
    else
    {
        printf("Error deleting student: %s\n", sqlite3_errmsg(db));
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
        printf("4. Delete student\n");
        printf("5. Exit\n");
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
            delete_student();
        else if (choice == 5)
            printf("Goodbye!\n");
        else
            printf("Invalid choice.\n");

    } while (choice != 5);

    sqlite3_close(db);
    return 0;
}