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
                "f2_temp_zone1": row[6],
                "f2_temp_zone2": row[7],
                "f2_fuel_state": row[8],
                "f2_vel_motor": row[9],
                "f2_setpoint": row[10],
                "timestamp": row[11]
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
                f2_temp_zone1, f2_temp_zone2,
                f2_fuel_state, f2_vel_motor, f2_setpoint,
                timestamp
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """

            cursor.execute(insert_query, (
                data["f1_temp_zone1"],
                data["f1_temp_zone2"],
                data["f1_fuel_state"],
                data["f1_vel_motor"],
                data["f1_setpoint"],
                data["f2_temp_zone1"],
                data["f2_temp_zone2"],
                data["f2_fuel_state"],
                data["f2_vel_motor"],
                data["f2_setpoint"],
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
