import sqlite3

class HouseDAO:
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    def get_last_house_data(self):
        """
        Busca e retorna a última linha da tabela 'house'.

        Retorna:
            Uma tupla com os dados da última linha, ou None se a tabela estiver vazia.
        """
        try:
            # Conecta ao banco de dados (cria o arquivo se não existir)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()


            # Executa a consulta para obter a última linha
            cursor.execute("SELECT * FROM house ORDER BY id DESC LIMIT 1")

            # Busca o resultado
            last_row = cursor.fetchone()

            data_dict = {
                "temperature": last_row[1],
                "humidity": last_row[2],
                "luminosity": last_row[3],
                "movement": bool(last_row[4]),
                "timestamp": last_row[5]
            }

            return data_dict

        except sqlite3.Error as e:
            print(f"Erro ao acessar o banco de dados SQLite: {e}")
            return None
        finally:
            # Fecha a conexão com o banco de dados
            if conn:
                conn.close()

    def get_all_house_data(self):
        """
        Busca e retorna todas as linhas da tabela 'house'.

        Retorna:
            Uma lista de tuplas, onde cada tupla representa uma linha da tabela.
        """
        try:
            # Conecta ao banco de dados (cria o arquivo se não existir)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Executa a consulta para obter todas as linhas
            cursor.execute("SELECT * FROM house")

            # Busca todos os resultados
            all_rows = cursor.fetchall()

            return all_rows

        except sqlite3.Error as e:
            print(f"Erro ao acessar o banco de dados SQLite: {e}")
            return []
        finally:
            # Fecha a conexão com o banco de dados
            if conn:
                conn.close()

    def insert_house_data(self, house: dict):
        """
        Insere uma nova linha na tabela 'house'.

        Args:
            house (dict): Um dicionário contendo os dados da casa, com as chaves:
                - temperature: Temperatura em graus Celsius
                - humidity: Umidade em porcentagem
                - luminosity: Luminosidade em lux
                - movement: Movimento (booleano)
                - timestamp: Timestamp da leitura (opcional, se não fornecido, será gerado automaticamente)
        """

        try:
            # Conecta ao banco de dados (cria o arquivo se não existir)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Prepara a consulta de inserção
            insert_query = """
            INSERT INTO house (temperature, humidity, luminosity, movement, timestamp)
            VALUES (?, ?, ?, ?, ?)
            """

            # Executa a inserção com os dados fornecidos
            cursor.execute(insert_query, (
                house['temperature'],
                house['humidity'],
                house['luminosity'],
                house['movement'],
                house.get('timestamp', None)  # Usa o timestamp fornecido ou None
            ))

            # Salva as alterações
            conn.commit()

            return cursor.lastrowid  # Retorna o ID da nova linha inserida

        except sqlite3.Error as e:
            print(f"Erro ao inserir dados no banco de dados SQLite: {e}")
        finally:
            # Fecha a conexão com o banco de dados
            if conn:
                conn.close()
    
    # def get_modbus_data(self):
    #     """
    #     Busca e retorna os dados do Modbus da tabela 'modbus'.

    #     Retorna:
    #         Uma lista de tuplas, onde cada tupla representa uma linha da tabela.
    #     """
    #     try:
    #         # Conecta ao banco de dados (cria o arquivo se não existir)
    #         conn = sqlite3.connect(self.db_path)
    #         cursor = conn.cursor()

    #         # Executa a consulta para obter todas as linhas
    #         cursor.execute("SELECT * FROM modbus")

    #         # Busca todos os resultados
    #         modbus_data = cursor.fetchall()

    #         return modbus_data

    #     except sqlite3.Error as e:
    #         print(f"Erro ao acessar o banco de dados SQLite: {e}")
    #         return []
    #     finally:
    #         # Fecha a conexão com o banco de dados
    #         if conn:
    #             conn.close()