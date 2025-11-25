import sqlite3

if __name__ == "__main__":
    
    connection = sqlite3.connect('furnaces_database.db')

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS furnace_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            f1_temp_zone1     REAL NOT NULL,
            f1_temp_zone2     REAL NOT NULL,
            f1_temp_zone3     REAL NOT NULL,
            f1_fuel_state     INTEGER NOT NULL,
            f1_setpoint       REAL NOT NULL,
            f1_mode_operation INTEGER NOT NULL,
            f2_temp_zone1     REAL NOT NULL,
            f2_temp_zone2     REAL NOT NULL,
            f2_temp_zone3     REAL NOT NULL,
            f2_fuel_state     INTEGER NOT NULL,
            f2_setpoint       REAL NOT NULL,
            f2_mode_operation INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    connection.commit()
    connection.close()