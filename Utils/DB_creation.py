import sqlite3

if __name__ == "__main__":
    
    connection = sqlite3.connect('house_database.db')

    connection.execute(
        """
        CREATE TABLE house (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            temperature REAL NOT NULL,
            humidity REAL NOT NULL,
            luminosity INTEGER NOT NULL,
            movement INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """
    )