import time
import random

from pyModbusTCP.server import ModbusServer
from pyModbusTCP.utils import encode_ieee, long_list_to_word

class ServidorModBus:
    def __init__(self, host_ip: str, porta: int) -> None:
        self._server = ModbusServer(host=host_ip, port=porta, no_block=True)
    
    def run(self, sleep_time: int) -> None:

        print("Iniciando servidor Modbus TCP...")
        self._server.start()

        print(f"\nServidor Modbus TCP iniciado em {self._server.host}:{self._server.port}")

        while True:

            tempeture = random.uniform(0, 50)
            humidity = random.uniform(0, 100)
            luminosidade = random.uniform(0, 1023)
            movement = random.choice([True, False])

            print(f"\nDados gerados:\n"
                  f"Temperatura: {tempeture:.2f} °C\n"
                  f"Umidade: {humidity:.2f} %\n"
                  f"Luminosidade: {luminosidade:.2f}\n"
                  f"Movimento: {'Sim' if movement else 'Não'}\n")

            # Codificando para os valores de ponto flutuante IEEE 754
            tempeture = encode_ieee(tempeture)
            temp_word_list = long_list_to_word([tempeture])
            humidity = encode_ieee(humidity)
            humidity_word_list = long_list_to_word([humidity])

            # Salva os valores nos registradores do server
            self._server.data_bank.set_holding_registers(1000, temp_word_list)
            self._server.data_bank.set_holding_registers(1001, [movement])
            self._server.data_bank.set_holding_registers(1002, humidity_word_list)
            self._server.data_bank.set_holding_registers(1003, [luminosidade])

            time.sleep(sleep_time)
        