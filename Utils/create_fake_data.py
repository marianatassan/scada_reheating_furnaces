import sqlite3
import random
from datetime import datetime, timedelta

# --- Configuração ---
DB_FILE = "furnaces_database.db"
TABLE_NAME = "furnace_data"

def create_24h_custom_data():
    """
    Limpa a tabela e a preenche com dados personalizados simulando um ciclo de 24 horas.
    """
    print("Iniciando a geração de dados de 24 horas...")
    
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()

        # 1. (Opcional) Limpa a tabela para começar do zero
        print(f"Limpando dados antigos da tabela '{TABLE_NAME}'...")
        cursor.execute(f"DELETE FROM {TABLE_NAME};")
        # Reseta a contagem do AUTOINCREMENT para começar do 1 novamente
        cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{TABLE_NAME}';")
        print("Tabela limpa.")

        # 2. Gera e insere os dados hora a hora
        print("Gerando e inserindo novos dados...")
        
        # Pega a hora atual como ponto de partida
        now = datetime.now()
        
        for i in range(24):
            # 3. Calcula o timestamp para cada registro, retrocedendo no tempo
            current_timestamp = now - timedelta(hours=i)
            hour_of_day = current_timestamp.hour

            # 4. Gera dados personalizados baseados na hora do dia
            
            # Temperatura: mais frio de madrugada, esquenta durante o dia
            if 0 <= hour_of_day < 6: # Madrugada
                temp = round(random.uniform(18.0, 21.0), 2)
            elif 6 <= hour_of_day < 12: # Manhã
                temp = round(random.uniform(21.0, 25.0), 2)
            elif 12 <= hour_of_day < 18: # Tarde
                temp = round(random.uniform(25.0, 29.0), 2)
            else: # Noite
                temp = round(random.uniform(21.0, 24.0), 2)

            # Umidade: geralmente maior quando a temperatura é menor
            humidity = round(random.uniform(50.0, 65.0) + (25 - temp), 2)

            # Luminosidade: escuridão total à noite, luz máxima ao meio-dia
            if 7 <= hour_of_day < 18: # Período de luz do dia
                # Simula o pico de luz perto do meio-dia
                if 11 <= hour_of_day <= 14:
                    luminosity = random.randint(800, 1023)
                else:
                    luminosity = random.randint(400, 799)
            else: # Período noturno
                luminosity = random.randint(0, 50)
            
            # Movimento: mais provável durante o dia
            movement_chance = 0.6 if 7 <= hour_of_day < 23 else 0.1
            movement = 1 if random.random() < movement_chance else 0 # 1=True, 0=False
            
            # Dados a serem inseridos
            data_to_insert = (
                temp, 
                humidity, 
                luminosity, 
                movement,
                current_timestamp.strftime('%Y-%m-%d %H:%M:%S') # Formata o timestamp
            )
            
            # 5. Insere os dados no banco
            insert_query = f"""
            INSERT INTO {TABLE_NAME} (temperature, humidity, luminosity, movement, timestamp)
            VALUES (?, ?, ?, ?, ?);
            """
            cursor.execute(insert_query, data_to_insert)

    print("Dados de 24 horas inseridos com sucesso!")


def show_all_data():
    """
    Mostra todos os dados da tabela para verificação.
    """
    print("\n--- Conteúdo Gerado na Tabela 'house' (últimas 24h) ---")
    try:
        with sqlite3.connect(DB_FILE) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Ordena por timestamp para ver a progressão correta
            cursor.execute(f"SELECT * FROM {TABLE_NAME} ORDER BY timestamp ASC")
            rows = cursor.fetchall()
            
            if not rows:
                print("A tabela está vazia.")
                return

            print(f"{'ID':<5} {'Timestamp':<22} {'Temp (°C)':<10} {'Umidade (%)':<12} {'Luz':<8} {'Movimento'}")
            print("-" * 80)

            for row in rows:
                movement_str = "Sim" if row["movement"] == 1 else "Não"
                print(f"{row['id']:<5} {row['timestamp']:<22} {row['temperature']:<10.2f} {row['humidity']:<12.2f} {row['luminosity']:<8} {movement_str}")

    except sqlite3.Error as e:
        print(f"Ocorreu um erro ao ler os dados: {e}")

# --- Bloco de Execução Principal ---
if __name__ == "__main__":
    # Garante que a tabela exista (reaproveitando a função do script anterior)
    # Se você não tiver, descomente e implemente a função create_database_and_table
    # create_database_and_table() 
    
    # 1. Cria e insere os dados personalizados de 24h
    create_24h_custom_data()
    
    # 2. Mostra os dados inseridos para confirmar
    show_all_data()