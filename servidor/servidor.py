import time
import random

from pyModbusTCP.server import ModbusServer
from pyModbusTCP.utils import encode_ieee, long_list_to_word


class ServidorModBus:
    def __init__(self, host_ip: str, porta: int) -> None:
        self._server = ModbusServer(host=host_ip, port=porta, no_block=True)

    def run(self, sleep_time: int = 5) -> None:
        print("Iniciando servidor Modbus TCP...")
        self._server.start()
        print(f"\nServidor Modbus TCP iniciado em {self._server.host}:{self._server.port}")

        while True:

            # =======================================================
            #           GERAÇÃO DE DADOS PARA OS DOIS FORNOS
            # =======================================================

            # -------- Furnace 1 --------
            f1_temp_z1 = random.uniform(845, 1045)
            f1_temp_z2 = random.uniform(1045, 1255)
            f1_fuel = random.choice([0, 1])         # desligado/ligado
            f1_vel_motor = random.uniform(0, 1800)
            f1_setpoint = random.uniform(495, 1355)


            # =======================================================
            #           PRINT PARA DEPURAÇÃO (MODELO DO ROBSON)
            # =======================================================

            print("\n===== DADOS GERADOS (MODBUS) =====")
            print("FURNACE 1:")
            print(f"  Z1: {f1_temp_z1:.2f} °C")
            print(f"  Z2: {f1_temp_z2:.2f} °C")
            print(f"  Combustível: {'Ligado' if f1_fuel else 'Desligado'}")
            print(f"  Velocidade Motor: {f1_vel_motor:.2f} rpm")
            print(f"  Setpoint: {f1_setpoint:.2f}")


            # =======================================================
            #           CONVERSÃO IEEE 754 PARA FLOAT (MODELO ROBSON)
            # =======================================================

            def encode_float(value):
                ieee = encode_ieee(value)
                return long_list_to_word([ieee])

            # =======================================================
            #           ESCRITA NOS REGISTRADORES HOLDING
            # =======================================================

            # Furnace
            self._server.data_bank.set_holding_registers(1000, encode_float(f1_temp_z1))
            self._server.data_bank.set_holding_registers(1002, encode_float(f1_temp_z2))
            self._server.data_bank.set_holding_registers(1004, [f1_fuel])
            self._server.data_bank.set_holding_registers(1006, encode_float(f1_vel_motor))
            self._server.data_bank.set_holding_registers(1008, encode_float(f1_setpoint))

            time.sleep(sleep_time)
