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
                "f1_temp_zone3": row[3],
                "f1_fuel_state": row[4],
                "f1_setpoint": row[5],
                "f1_mode_operation": row[6],
                "f2_temp_zone1": row[7],
                "f2_temp_zone2": row[8],
                "f2_temp_zone3": row[9],
                "f2_fuel_state": row[10],
                "f2_setpoint": row[11],
                "f2_mode_operation": row[12],
                "timestamp": row[13]
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

        Espera um dicionário com as chaves:
            f1_temp_zone1, f1_temp_zone2, f1_temp_zone3,
            f1_fuel_state, f1_setpoint, f1_mode_operation,
            f2_temp_zone1, f2_temp_zone2, f2_temp_zone3,
            f2_fuel_state, f2_setpoint, f2_mode_operation,
            timestamp (opcional)
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            insert_query = """
            INSERT INTO furnace_data (
                f1_temp_zone1, f1_temp_zone2, f1_temp_zone3,
                f1_fuel_state, f1_setpoint, f1_mode_operation,
                f2_temp_zone1, f2_temp_zone2, f2_temp_zone3,
                f2_fuel_state, f2_setpoint, f2_mode_operation,
                timestamp
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """

            cursor.execute(insert_query, (
                data["f1_temp_zone1"],
                data["f1_temp_zone2"],
                data["f1_temp_zone3"],
                data["f1_fuel_state"],
                data["f1_setpoint"],
                data["f1_mode_operation"],
                data["f2_temp_zone1"],
                data["f2_temp_zone2"],
                data["f2_temp_zone3"],
                data["f2_fuel_state"],
                data["f2_setpoint"],
                data["f2_mode_operation"],
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
