import time
from datetime import datetime
from threading import Thread

from pyModbusTCP.client import ModbusClient
from pyModbusTCP.utils import decode_ieee, word_list_to_long

from furnace_dao import FurnaceDAO


class ClienteModBus:
    def __init__(self, server_ip: str, porta: int, tags_address: dict, read_time: int, db_path: str):
        
        self._client = ModbusClient(host=server_ip, port=porta)
        self.tags_address = tags_address
        self.read_time = read_time
        self.db_path = db_path
        
        self._threads = []


    # ============================================================
    # LEITURA CONTÍNUA DO MODBUS
    # ============================================================
    def get_data(self):

        try:
            print("\nConectando ao servidor Modbus...")
            self._client.open()
            print(f"Conectado em {self._client.host}:{self._client.port}")

            dao = FurnaceDAO(self.db_path)
            data = {}
            while True:

                data["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                for tag, adress in self.tags_address.items():

                    # FLOAT (Temperaturas)
                    if "temp" in tag:
                        regs = self._client.read_holding_registers(adress, 2)
                        regs = word_list_to_long(regs, big_endian=True)
                        data[tag] = decode_ieee(regs[0])

                    # BOOLEANO (Combustível)
                    elif "fuel" in tag:
                        data[tag] = int(self._client.read_holding_registers(adress, 1)[0])

                    # FLOAT (Setpoints)
                    elif "setpoint" in tag:
                        regs = self._client.read_holding_registers(adress, 2)
                        regs = word_list_to_long(regs, big_endian=True)
                        data[tag] = decode_ieee(regs[0])

                    # INTEIRO (Modo)
                    elif "mode" in tag:
                        data[tag] = int(self._client.read_holding_registers(adress, 1)[0])

                print(f"\nDADOS COLETADOS:\n{data}")

                # Insere no banco de dados
                dao.insert_furnace_data(data)

                time.sleep(self.read_time)

        except Exception as e:
            print(f"Erro ao obter dados do servidor Modbus: {e}")


    # ============================================================
    # INICIA A THREAD
    # ============================================================
    def run(self):
        print("\nIniciando thread de leitura Modbus...")
        self._threads.append(Thread(target=self.get_data))

        for t in self._threads:
            t.start()


    # ============================================================
    # LEITURA ÚNICA (para testes)
    # ============================================================
    def read_once(self):
        try:
            self._client.open()
            dao = FurnaceDAO(self.db_path)

            data = {}
            data["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            for tag, adress in self.tags_address.items():

                if "temp" in tag or "setpoint" in tag:
                    regs = self._client.read_holding_registers(adress, 2)
                    regs = word_list_to_long(regs, big_endian=True)
                    data[tag] = decode_ieee(regs[0])

                else:
                    data[tag] = int(self._client.read_holding_registers(adress, 1)[0])

            dao.insert_furnace_data(data)
            return data

        except Exception as e:
            print(f"Erro na leitura única: {e}")
            return None
