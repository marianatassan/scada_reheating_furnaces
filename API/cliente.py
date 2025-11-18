import time

from datetime import datetime
from pyModbusTCP.client import ModbusClient
from threading import Thread
from pyModbusTCP.utils import decode_ieee, word_list_to_long
from house_dao import HouseDAO

class ClienteModBus:
    def __init__(self, server_ip: str, porta: int, tags_adress: dict, read_time: int, db_path: str) -> None:
        
        self._client = ModbusClient(host=server_ip, port=porta) # Cliente Modbus TCP

        self.tags_adress = tags_adress # Dicionário com os endereços das tags
        self.read_time = read_time # Tempo de leitura em segundos

        self._threads = [] # Lista para armazenar as threads

        self.db_path = db_path  # Caminho do banco de dados

    def get_data(self):
        try:
            print('\n Obtendo dados do servidor Modbus...')

            self._client.open()

            print(f"\nConectado ao servidor Modbus em {self._client.host}:{self._client.port}")

            data = {}

            while True:
                data['timestamp'] = datetime.now().strftime('%d-%m-%Y %H:%M:%S')

                for tag_name in self.tags_adress:
                    
                    tag_adress = self.tags_adress[tag_name]

                    if tag_name == 'temperature' or tag_name == 'humidity':

                        reg_list = self._client.read_holding_registers(tag_adress, 2)
                        
                        reg_list = word_list_to_long(reg_list, big_endian=True)
                        
                        data[tag_name] = decode_ieee(reg_list[0])
                    
                    else:
                        data[tag_name] = self._client.read_holding_registers(tag_adress, 1)[0]

                print(f"\nDados: {data}")

                # Insere os dados no banco de dados
                casa_automatizada = HouseDAO(self.db_path)  
                casa_automatizada.insert_house_data(data)

                time.sleep(self.read_time)

        except Exception as e:
            print(f"\n\nErro ao conectar ao servidor Modbus: {e}")
            return None
        
    def run(self):

        self._threads.append(
            Thread(target=self.get_data)
        )

        for t in self._threads:
            print("\nIniciando thread")
            t.start()

    def ler_modbus_uma_vez(self):
        try:
            self._client.open()
            data = {}

            data['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            for tag_name in self.tags_adress:
                tag_adress = self.tags_adress[tag_name]

                if tag_name in ['temperature', 'humidity']:
                    reg_list = self._client.read_holding_registers(tag_adress, 2)
                    reg_list = word_list_to_long(reg_list, big_endian=True)
                    data[tag_name] = decode_ieee(reg_list[0])
                else:
                    data[tag_name] = self._client.read_holding_registers(tag_adress, 1)[0]

            # Converte movimento para booleano
            data['movement'] = bool(data['movement'])

            casa_automatizada = HouseDAO(self.db_path)  
            casa_automatizada.insert_house_data(data)

            return data

        except Exception as e:
            print(f"Erro na leitura única Modbus: {e}")
        return None
