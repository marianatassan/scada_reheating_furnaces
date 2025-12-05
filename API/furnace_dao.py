import sqlite3

class FurnaceDAO:
    def __init__(self, db_path: str):
        self.db_path = db_path

    # ==========================================================
    #   GET LAST DATA
    # ==========================================================
    def get_last_furnace_data(self):
        """
        Retorna a última leitura registrada em furnace_data
        no formato de dicionário com todos os campos fixos.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("SELECT * FROM furnace_data ORDER BY id DESC LIMIT 1")
            row = cursor.fetchone()

            if not row:
                return None

            data = {
                "f1_temp_zone1": row[1],
                "f1_temp_zone2": row[2],
                "f1_fuel_state": row[3],
                "f1_vel_motor": row[4],
                "f1_setpoint": row[5],
                "timestamp": row[6]
            }

            return data

        except sqlite3.Error as e:
            print(f"Erro ao acessar o banco SQLite: {e}")
            return None
        
        finally:
            if conn:
                conn.close()

    # ==========================================================
    #   GET ALL DATA
    # ==========================================================
    def get_all_furnace_data(self):
        """
        Retorna todas as linhas da tabela furnace_data.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("SELECT * FROM furnace_data")
            rows = cursor.fetchall()

            return rows

        except sqlite3.Error as e:
            print(f"Erro ao acessar o banco SQLite: {e}")
            return []

        finally:
            if conn:
                conn.close()

    def get_history(self):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                SELECT f1_temp_zone1, f1_temp_zone2, f1_fuel_state, f1_vel_motor, f1_setpoint, timestamp
                FROM furnace_data
                WHERE timestamp >= datetime('now', 'localtime', '-1 hour')
                ORDER BY timestamp DESC
            """)


            rows = cursor.fetchall()

            return [
                {
                    "f1_temp_zone1": r[0],
                    "f1_temp_zone2": r[1],
                    "f1_fuel_state": r[2],
                    "f1_vel_motor": r[3],
                    "f1_setpoint": r[4],
                    "timestamp": r[5]
                }
                for r in rows
            ]

        except sqlite3.Error as e:
            print(f"Erro ao acessar o banco SQLite: {e}")
            return []
        finally:
            if conn:
                conn.close()


    # ==========================================================
    #   INSERT DATA
    # ==========================================================
    def insert_furnace_data(self, data: dict):
        """
        Insere uma nova linha em furnace_data.

        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            insert_query = """
            INSERT INTO furnace_data (
                f1_temp_zone1, f1_temp_zone2,
                f1_fuel_state, f1_vel_motor, f1_setpoint,
                timestamp
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """

            cursor.execute(insert_query, (
                data["f1_temp_zone1"],
                data["f1_temp_zone2"],
                data["f1_fuel_state"],
                data["f1_vel_motor"],
                data["f1_setpoint"],
                data.get("timestamp", None)
            ))

            conn.commit()
            return cursor.lastrowid

        except sqlite3.Error as e:
            print(f"Erro ao inserir dados no SQLite: {e}")
            return None
        
        finally:
            if conn:
                conn.close()
